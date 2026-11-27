-- INVENTÁRIO SOMENTE LEITURA. Não altera tabelas nem registros.
-- Executar no SQL Editor do projeto Supabase correto: Sistemas de Comandas.
-- Verifique os resultados antes de qualquer migração.
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('comandas','mesas','comanda_itens','comanda_ajustes','reservas')
ORDER BY table_name, ordinal_position;

SELECT c.conrelid::regclass AS tabela, c.conname AS restricao,
       c.contype AS tipo, pg_get_constraintdef(c.oid) AS definicao
FROM pg_constraint c
WHERE c.connamespace = 'public'::regnamespace
  AND c.conrelid::regclass::text IN
  ('comandas', 'mesas', 'comanda_itens', 'comanda_ajustes', 'reservas')
ORDER BY tabela, restricao;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
 AND tablename IN ('comandas','mesas','comanda_itens','comanda_ajustes')
ORDER BY tablename,indexname;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
 AND tablename IN ('comandas','mesas','comanda_itens','comanda_ajustes')
ORDER BY tablename, policyname;

SELECT tgrelid::regclass AS tabela,tgname AS trigger,
       pg_get_triggerdef(oid) AS definicao
FROM pg_trigger
WHERE NOT tgisinternal
 AND tgrelid::regclass::text IN ('comandas','mesas','comanda_itens','comanda_ajustes')
ORDER BY tabela,tgname;

SELECT mesa_id, count(*) AS abertas
FROM public.comandas
WHERE status = 'aberta'
GROUP BY mesa_id
ORDER BY abertas DESC, mesa_id;
