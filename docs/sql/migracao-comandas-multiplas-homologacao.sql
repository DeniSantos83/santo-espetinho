-- MIGRAÇÃO PLANEJADA. NÃO EXECUTAR NO AMBIENTE DE PRODUÇÃO SEM BACKUP E HOMOLOGAÇÃO.
-- Supabase > SQL Editor, após validação de todo o frontend e do esquema.
-- A execução é transacional e os dados de comandas existentes são preservados.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='comandas' AND indexname='comandas_mesa_aberta_unique')
 THEN RAISE EXCEPTION 'Índice esperado não encontrado; reavaliar o esquema antes da migração'; END IF;
END $$;
DROP INDEX public.comandas_mesa_aberta_unique;
CREATE INDEX IF NOT EXISTS comandas_mesa_status_idx ON public.comandas(mesa_id,status);

CREATE OR REPLACE FUNCTION public.abrir_comanda_na_mesa(
 p_mesa_id uuid, p_cliente text DEFAULT NULL, p_observacoes text DEFAULT NULL, p_reserva_id uuid DEFAULT NULL
) RETURNS public.comandas
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE v_mesa public.mesas%ROWTYPE;
 v_usuario public.usuarios%ROWTYPE;
 v_comanda public.comandas%ROWTYPE;
BEGIN
 SELECT * INTO v_usuario FROM public.usuarios
 WHERE auth_id = auth.uid() AND ativo IS TRUE AND perfil IN ('admin','gerente','garcom');
 IF NOT FOUND THEN RAISE EXCEPTION 'Funcionário sem autorização'; END IF;
 SELECT * INTO v_mesa FROM public.mesas WHERE id = p_mesa_id FOR UPDATE;
 IF NOT FOUND OR v_mesa.ativa IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Mesa indisponível'; END IF;
 IF v_mesa.mesa_principal_id IS NOT NULL OR v_mesa.grupo_mesas_id IS NOT NULL
 THEN RAISE EXCEPTION 'Utilize a mesa principal ou desfaça o agrupamento antes de criar uma comanda individual'; END IF;
 IF EXISTS (SELECT 1 FROM public.reservas_mesas r WHERE r.mesa_id = p_mesa_id AND r.status = 'ativa')
  AND NOT EXISTS (SELECT 1 FROM public.comandas c WHERE c.mesa_id = p_mesa_id AND c.status = 'aberta') THEN
   IF p_reserva_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.reservas_mesas r
      WHERE r.id=p_reserva_id AND r.mesa_id=p_mesa_id AND r.status='ativa'
   ) THEN RAISE EXCEPTION 'Mesa reservada: inicie o atendimento da reserva pelo painel de gestão'; END IF;
 END IF;
 INSERT INTO public.comandas (
 mesa_id,usuario_id,cliente,observacoes,status,aberta_em
 ) VALUES (
 p_mesa_id,v_usuario.id,NULLIF(BTRIM(p_cliente),''),NULLIF(BTRIM(p_observacoes),''),'aberta',now()
 ) RETURNING * INTO v_comanda;
 UPDATE public.mesas SET status='ocupada' WHERE id=p_mesa_id;
 IF p_reserva_id IS NOT NULL THEN
   IF v_usuario.perfil NOT IN ('admin','gerente') THEN
     RAISE EXCEPTION 'Somente a gestão pode atender uma reserva';
   END IF;
   UPDATE public.reservas_mesas
   SET status='atendida',atendida_em=now()
   WHERE id=p_reserva_id AND mesa_id=p_mesa_id AND status='ativa';
   IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada ou já atendida'; END IF;
 END IF;
 RETURN v_comanda;
END $$;

CREATE OR REPLACE FUNCTION public.fechar_comanda_individual(
 p_comanda_id uuid,p_quantidade_pessoas integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE v_mesa_id uuid; v_status text; v_itens integer;
 v_consumo numeric(12,2);v_acrescimos numeric(12,2);v_descontos numeric(12,2);
 v_total numeric(12,2);v_restantes integer;v_usuario public.usuarios%ROWTYPE;
BEGIN
 SELECT * INTO v_usuario FROM public.usuarios
 WHERE auth_id=auth.uid() AND ativo IS TRUE AND perfil IN ('admin','gerente');
 IF NOT FOUND THEN RAISE EXCEPTION 'Somente administração ou gerência pode fechar contas'; END IF;
 IF p_quantidade_pessoas IS NULL OR p_quantidade_pessoas NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'Quantidade de pessoas inválida'; END IF;
 SELECT mesa_id INTO v_mesa_id FROM public.comandas WHERE id=p_comanda_id;
 IF v_mesa_id IS NULL THEN RAISE EXCEPTION 'Comanda não encontrada ou sem mesa'; END IF;
 -- A mesma trava de mesa é usada ao abrir e ao fechar, serializando as operações concorrentes.
 PERFORM 1 FROM public.mesas WHERE id=v_mesa_id FOR UPDATE;
 SELECT status INTO v_status FROM public.comandas WHERE id=p_comanda_id FOR UPDATE;
 IF v_status IS DISTINCT FROM 'aberta' THEN RAISE EXCEPTION 'Comanda não está aberta'; END IF;
 SELECT count(*),coalesce(sum(subtotal),0) INTO v_itens,v_consumo
 FROM public.comanda_itens WHERE comanda_id=p_comanda_id;
 IF v_itens=0 THEN RAISE EXCEPTION 'Não é possível fechar uma comanda sem itens'; END IF;
 SELECT coalesce(sum(valor) FILTER (WHERE tipo='acrescimo'),0),
 coalesce(sum(valor) FILTER (WHERE tipo='desconto'),0)
 INTO v_acrescimos,v_descontos FROM public.comanda_ajustes WHERE comanda_id=p_comanda_id;
 v_total:=greatest(v_consumo+v_acrescimos-v_descontos,0);
 UPDATE public.comandas SET
 status='fechada',fechada_em=now(),subtotal_consumo=v_consumo,total=v_consumo,
 total_acrescimos=v_acrescimos,total_descontos=v_descontos,total_final=v_total,
 quantidade_pessoas=p_quantidade_pessoas,valor_por_pessoa=round(v_total/p_quantidade_pessoas,2)
 WHERE id=p_comanda_id;
 SELECT count(*) INTO v_restantes FROM public.comandas
 WHERE mesa_id=v_mesa_id AND status='aberta';
 IF v_restantes=0 THEN
   -- Não liberar um grupo se qualquer outra mesa agrupada ainda tiver comanda aberta.
   IF EXISTS (
     SELECT 1 FROM public.comandas c
     JOIN public.mesas m ON m.id=c.mesa_id
     WHERE c.status='aberta' AND (
       m.id=v_mesa_id OR m.mesa_principal_id=v_mesa_id
       OR m.grupo_mesas_id=v_mesa_id
     )
   ) THEN
     RAISE EXCEPTION 'Grupo de mesas ainda possui comandas abertas';
   END IF;
   UPDATE public.mesas SET
     status='livre', mesa_principal_id=NULL, grupo_mesas_id=NULL
   WHERE id=v_mesa_id OR grupo_mesas_id=v_mesa_id;
 END IF;
 RETURN jsonb_build_object('comanda_id',p_comanda_id,'mesas_comandas_restantes',v_restantes,'mesa_liberada',v_restantes=0,'total',v_total);
END $$;

-- Cancelar somente comanda sem consumo, sem liberar mesa com outras comandas.
CREATE OR REPLACE FUNCTION public.cancelar_comanda_individual(p_comanda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE v_mesa_id uuid; v_status text; v_restantes integer;
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.usuarios u WHERE u.auth_id=auth.uid()
   AND u.ativo IS TRUE AND u.perfil IN ('admin','gerente')
 ) THEN RAISE EXCEPTION 'Somente administração ou gerência pode cancelar uma comanda'; END IF;
 SELECT mesa_id INTO v_mesa_id FROM public.comandas WHERE id=p_comanda_id;
 IF v_mesa_id IS NULL THEN RAISE EXCEPTION 'Comanda não encontrada'; END IF;
 PERFORM 1 FROM public.mesas WHERE id=v_mesa_id FOR UPDATE;
 SELECT status INTO v_status FROM public.comandas WHERE id=p_comanda_id FOR UPDATE;
 IF v_status IS DISTINCT FROM 'aberta' THEN RAISE EXCEPTION 'Comanda não está aberta'; END IF;
 IF EXISTS(SELECT 1 FROM public.comanda_itens WHERE comanda_id=p_comanda_id)
 OR EXISTS(SELECT 1 FROM public.comanda_ajustes WHERE comanda_id=p_comanda_id)
 THEN RAISE EXCEPTION 'Remova itens e ajustes antes de cancelar'; END IF;
 UPDATE public.comandas SET status='cancelada',fechada_em=now() WHERE id=p_comanda_id;
 SELECT count(*) INTO v_restantes FROM public.comandas WHERE mesa_id=v_mesa_id AND status='aberta';
 IF v_restantes=0 THEN
   IF EXISTS (
     SELECT 1 FROM public.comandas c
     JOIN public.mesas m ON m.id=c.mesa_id
     WHERE c.status='aberta' AND (
       m.id=v_mesa_id OR m.mesa_principal_id=v_mesa_id
       OR m.grupo_mesas_id=v_mesa_id
     )
   ) THEN RAISE EXCEPTION 'Grupo de mesas ainda possui comandas abertas'; END IF;
   UPDATE public.mesas SET status='livre', mesa_principal_id=NULL, grupo_mesas_id=NULL
   WHERE id=v_mesa_id OR grupo_mesas_id=v_mesa_id;
 END IF;
 RETURN jsonb_build_object('comanda_id',p_comanda_id,'comandas_restantes',v_restantes,'mesa_liberada',v_restantes=0);
END $$;


-- Proteção contra lançamento ou alteração de consumo após o fechamento.
-- Bloqueia alterações que contornem o fluxo oficial por acesso direto às tabelas.
-- A trava de linha também serializa lançamentos concorrentes com o fechamento.
CREATE OR REPLACE FUNCTION public.proteger_comanda_encerrada()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
 v_id uuid;
 v_status text;
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN
   v_id := OLD.comanda_id;
   IF v_id IS NOT NULL THEN
     SELECT status INTO v_status FROM public.comandas WHERE id=v_id FOR UPDATE;
     IF v_status IS DISTINCT FROM 'aberta' THEN
       RAISE EXCEPTION 'Não é permitido modificar itens de comanda encerrada';
     END IF;
   END IF;
 END IF;
 IF TG_OP IN ('INSERT','UPDATE') THEN
   v_id := NEW.comanda_id;
   IF v_id IS NULL THEN RAISE EXCEPTION 'Comanda obrigatória para lançar itens'; END IF;
   SELECT status INTO v_status FROM public.comandas WHERE id=v_id FOR UPDATE;
   IF v_status IS DISTINCT FROM 'aberta' THEN
     RAISE EXCEPTION 'Não é permitido lançar itens em comanda encerrada';
   END IF;
 END IF;
 RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER proteger_itens_comanda_encerrada
BEFORE INSERT OR UPDATE OR DELETE ON public.comanda_itens
FOR EACH ROW EXECUTE FUNCTION public.proteger_comanda_encerrada();

CREATE TRIGGER proteger_ajustes_comanda_encerrada
BEFORE INSERT OR UPDATE OR DELETE ON public.comanda_ajustes
FOR EACH ROW EXECUTE FUNCTION public.proteger_comanda_encerrada();


REVOKE ALL ON FUNCTION public.abrir_comanda_na_mesa(uuid,text,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fechar_comanda_individual(uuid,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.cancelar_comanda_individual(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.abrir_comanda_na_mesa(uuid,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fechar_comanda_individual(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_comanda_individual(uuid) TO authenticated;
-- Transferência atômica de unidades entre comandas abertas DA MESMA MESA.
-- Não cria cobrança duplicada: move a linha inteira ou divide a quantidade.
CREATE OR REPLACE FUNCTION public.transferir_item_comanda(
 p_item_id uuid,
 p_comanda_destino_id uuid,
 p_quantidade integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $transf$
DECLARE
 v_item public.comanda_itens%ROWTYPE;
 v_origem public.comandas%ROWTYPE;
 v_destino public.comandas%ROWTYPE;
 v_id uuid;
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.usuarios u WHERE u.auth_id=auth.uid()
     AND u.ativo IS TRUE AND u.perfil IN ('admin','gerente','garcom')
 ) THEN RAISE EXCEPTION 'Funcionário sem autorização'; END IF;

 IF p_quantidade IS NULL OR p_quantidade < 1 THEN
   RAISE EXCEPTION 'A quantidade transferida deve ser positiva';
 END IF;
 IF p_item_id IS NULL OR p_comanda_destino_id IS NULL THEN
   RAISE EXCEPTION 'Item e comanda de destino são obrigatórios';
 END IF;

 -- Localizar a comanda de origem; trancar ambas em ordem estável
 -- antes de travar a linha do item.
 SELECT comanda_id INTO v_id FROM public.comanda_itens WHERE id=p_item_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
 IF v_id=p_comanda_destino_id THEN RAISE EXCEPTION 'Escolha outra comanda'; END IF;
 FOR v_id IN
   SELECT c.id FROM public.comandas c
   WHERE c.id IN ((SELECT comanda_id FROM public.comanda_itens WHERE id=p_item_id),p_comanda_destino_id)
   ORDER BY c.id
 LOOP
   PERFORM 1 FROM public.comandas WHERE id=v_id FOR UPDATE;
 END LOOP;
 SELECT * INTO v_item FROM public.comanda_itens WHERE id=p_item_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
 SELECT * INTO v_origem FROM public.comandas WHERE id=v_item.comanda_id;
 SELECT * INTO v_destino FROM public.comandas WHERE id=p_comanda_destino_id;
 IF v_origem.id IS NULL OR v_destino.id IS NULL
   OR v_origem.status<>'aberta' OR v_destino.status<>'aberta' THEN
   RAISE EXCEPTION 'As duas comandas precisam estar abertas';
 END IF;
 IF v_origem.mesa_id IS NULL OR v_origem.mesa_id IS DISTINCT FROM v_destino.mesa_id THEN
   RAISE EXCEPTION 'Transferência permitida apenas entre comandas da mesma mesa';
 END IF;
 IF v_item.quantidade < p_quantidade THEN
   RAISE EXCEPTION 'Quantidade maior que a disponível na comanda';
 END IF;

 IF v_item.quantidade=p_quantidade THEN
   UPDATE public.comanda_itens SET comanda_id=p_comanda_destino_id WHERE id=v_item.id;
 ELSE
   -- Primeiro diminui na origem; os triggers existentes recalculam subtotal.
   UPDATE public.comanda_itens SET quantidade=quantidade-p_quantidade WHERE id=v_item.id;
   INSERT INTO public.comanda_itens (
     comanda_id,produto_id,garcom_id,quantidade,preco_unitario,observacao,status
   ) VALUES (
     p_comanda_destino_id,v_item.produto_id,v_item.garcom_id,
     p_quantidade,v_item.preco_unitario,v_item.observacao,v_item.status
   );
 END IF;

 -- O trigger legado atualiza 'total' mas não o total_final de cada conta.
 PERFORM public.recalcular_valores_comanda(v_origem.id);
 PERFORM public.recalcular_valores_comanda(v_destino.id);
 RETURN jsonb_build_object(
   'item_id',p_item_id,
   'comanda_origem_id',v_origem.id,
   'comanda_destino_id',v_destino.id,
   'quantidade',p_quantidade
 );
END
$transf$;

REVOKE ALL ON FUNCTION public.transferir_item_comanda(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transferir_item_comanda(uuid,uuid,integer) TO authenticated;

COMMIT;
