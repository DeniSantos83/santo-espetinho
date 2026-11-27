-- Esquema MÍNIMO para teste automatizado, sem conexão ou dados de produção.
CREATE SCHEMA IF NOT EXISTS auth;
DO $roles$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
END
$roles$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $fn$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $fn$;

CREATE TABLE public.mesas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 numero integer UNIQUE NOT NULL,
 status text NOT NULL DEFAULT 'livre',
 ativa boolean NOT NULL DEFAULT true,
 mesa_principal_id uuid,
 grupo_mesas_id uuid
);
CREATE TABLE public.usuarios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_id uuid,
 perfil text NOT NULL,
 ativo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.comandas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 mesa_id uuid REFERENCES public.mesas(id),
 usuario_id uuid REFERENCES public.usuarios(id),
 cliente text,observacoes text,
 status text NOT NULL DEFAULT 'aberta',
 aberta_em timestamptz DEFAULT now(),fechada_em timestamptz,
 subtotal_consumo numeric DEFAULT 0,total numeric DEFAULT 0,
 total_acrescimos numeric DEFAULT 0,total_descontos numeric DEFAULT 0,
 total_final numeric DEFAULT 0,quantidade_pessoas integer DEFAULT 1,
 valor_por_pessoa numeric DEFAULT 0
);
CREATE UNIQUE INDEX comandas_mesa_aberta_unique ON public.comandas(mesa_id) WHERE status='aberta';
CREATE TABLE public.reservas_mesas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 mesa_id uuid REFERENCES public.mesas(id),
 status text DEFAULT 'ativa',
 atendida_em timestamptz
);
CREATE TABLE public.comanda_itens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 comanda_id uuid REFERENCES public.comandas(id),
 produto_id uuid,garcom_id uuid,
 quantidade integer NOT NULL,
 preco_unitario numeric NOT NULL,
 subtotal numeric GENERATED ALWAYS AS (quantidade*preco_unitario) STORED,
 observacao text,status text DEFAULT 'solicitado'
);
CREATE TABLE public.comanda_ajustes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 comanda_id uuid REFERENCES public.comandas(id),
 tipo text NOT NULL, valor numeric NOT NULL
);
-- Mock da função legada de recálculo, com a mesma assinatura pública.
CREATE OR REPLACE FUNCTION public.recalcular_valores_comanda(id_comanda uuid)
RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE consumo numeric;mais numeric;menos numeric;
BEGIN
 SELECT coalesce(sum(subtotal),0) INTO consumo FROM public.comanda_itens WHERE comanda_id=id_comanda;
 SELECT coalesce(sum(valor) FILTER(WHERE tipo='acrescimo'),0),
        coalesce(sum(valor) FILTER(WHERE tipo='desconto'),0)
 INTO mais,menos FROM public.comanda_ajustes WHERE comanda_id=id_comanda;
 UPDATE public.comandas
 SET total=consumo,subtotal_consumo=consumo,total_acrescimos=mais,total_descontos=menos,
 total_final=greatest(consumo+mais-menos,0)
 WHERE id=id_comanda;
END
$fn$;
