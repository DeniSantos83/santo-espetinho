-- Cenários executados exclusivamente no banco PostgreSQL efêmero do CI.
SET request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $test$
DECLARE
 m uuid; m2 uuid; a uuid; b uuid; c uuid; it uuid; t jsonb; value numeric; n int;
BEGIN
 INSERT INTO public.usuarios(auth_id,perfil)
 VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','admin');
 INSERT INTO public.mesas(numero) VALUES (1) RETURNING id INTO m;
 INSERT INTO public.mesas(numero) VALUES (2) RETURNING id INTO m2;
 SELECT id INTO a FROM public.abrir_comanda_na_mesa(m,'Ana');
 SELECT id INTO b FROM public.abrir_comanda_na_mesa(m,'Bruno');
 SELECT id INTO c FROM public.abrir_comanda_na_mesa(m,'Carla');
 SELECT count(*) INTO n FROM public.comandas WHERE mesa_id=m AND status='aberta';
 IF n<>3 THEN RAISE EXCEPTION 'Esperava 3 comandas abertas, obtido %',n; END IF;

 INSERT INTO public.comanda_itens(comanda_id,produto_id,quantidade,preco_unitario)
 VALUES(a,gen_random_uuid(),3,12) RETURNING id INTO it;
 SELECT public.transferir_item_comanda(it,b,2) INTO t;
 SELECT coalesce(sum(subtotal),0) INTO value FROM public.comanda_itens WHERE comanda_id=a;
 IF value<>12 THEN RAISE EXCEPTION 'Origem deveria ser 12, foi %',value; END IF;
 SELECT coalesce(sum(subtotal),0) INTO value FROM public.comanda_itens WHERE comanda_id=b;
 IF value<>24 THEN RAISE EXCEPTION 'Destino deveria ser 24, foi %',value; END IF;
 IF (t->>'quantidade')::integer<>2 THEN RAISE EXCEPTION 'Quantidade transferida incorreta'; END IF;
 SELECT coalesce(sum(subtotal),0) INTO value FROM public.comanda_itens WHERE comanda_id IN (a,b);
 IF value<>36 THEN RAISE EXCEPTION 'Soma financeira alterada por transferência'; END IF;

 -- Transferir linha integral, preservando o preço original.
 SELECT id INTO it FROM public.comanda_itens WHERE comanda_id=a LIMIT 1;
 PERFORM public.transferir_item_comanda(it,b,1);
 SELECT count(*) INTO n FROM public.comanda_itens WHERE comanda_id=a;
 IF n<>0 THEN RAISE EXCEPTION 'Origem deveria ficar sem itens'; END IF;
 SELECT coalesce(sum(subtotal),0) INTO value FROM public.comanda_itens WHERE comanda_id=b;
 IF value<>36 THEN RAISE EXCEPTION 'Transferência integral perdeu valores'; END IF;

 -- É proibido transferir para mesa diferente.
 SELECT id INTO it FROM public.comanda_itens WHERE comanda_id=b LIMIT 1;
 BEGIN
   PERFORM public.transferir_item_comanda(it,(SELECT id FROM public.abrir_comanda_na_mesa(m2,'Outro')),1);
   RAISE EXCEPTION 'Transferência entre mesas deveria ter falhado';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='Transferência entre mesas deveria ter falhado' THEN RAISE; END IF;
 END;

 -- Fechar uma conta sem liberar a mesa.
 PERFORM public.fechar_comanda_individual(b,1);
 IF (SELECT status FROM public.mesas WHERE id=m)<>'ocupada'
 THEN RAISE EXCEPTION 'Mesa liberada com outras contas abertas'; END IF;

 -- Item de conta fechada não pode ser alterado.
 BEGIN
   UPDATE public.comanda_itens SET quantidade=quantidade+1 WHERE id=it;
   RAISE EXCEPTION 'Item encerrado aceitou atualização';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='Item encerrado aceitou atualização' THEN RAISE; END IF;
 END;
 -- Impedir transferência para conta já fechada.
 INSERT INTO public.comanda_itens(comanda_id,produto_id,quantidade,preco_unitario)
 VALUES(a,gen_random_uuid(),1,4) RETURNING id INTO it;
 BEGIN
   PERFORM public.transferir_item_comanda(it,b,1);
   RAISE EXCEPTION 'Transferência para conta fechada foi aceita';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='Transferência para conta fechada foi aceita' THEN RAISE; END IF;
 END;

 -- Cancelar Carla sem consumo não libera a mesa.
 PERFORM public.cancelar_comanda_individual(c);
 IF (SELECT status FROM public.mesas WHERE id=m)<>'ocupada'
 THEN RAISE EXCEPTION 'Cancelamento parcial liberou mesa'; END IF;
 PERFORM public.fechar_comanda_individual(a,1);
 IF (SELECT status FROM public.mesas WHERE id=m)<>'livre'
 THEN RAISE EXCEPTION 'Mesa não liberada após última conta'; END IF;
 -- O fechamento não apaga histórico.
 SELECT count(*) INTO n FROM public.comandas WHERE mesa_id=m AND status='fechada';
 IF n<>2 THEN RAISE EXCEPTION 'Histórico de contas encerradas incorreto'; END IF;
 RAISE NOTICE 'OK: múltiplas comandas, transferência parcial/integral, saldos, fechamento e cancelamento';
END
$test$;
