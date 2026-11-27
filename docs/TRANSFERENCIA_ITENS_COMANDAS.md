# Múltiplas comandas por mesa — status de desenvolvimento

**Ainda não publicar em produção.** Esta branch prepara abertura, fechamento e cancelamento individual, além de **transferência de produtos e quantidades entre comandas abertas da mesma mesa**.

## Funcionalidades incluídas
- Garçom, gerente e administrador podem visualizar comandas distintas na mesma mesa.
- Gerenciamento de produtos por comanda, pré-contas individuais e totais independentes.
- Botão **Transferir para outra comanda** no modal de pedidos: escolhe destino e quantidade; confirma; chama `transferir_item_comanda`.
- Movimentação integral ou parcial preservando o preço unitário e o total conjunto.
- SQL transacional com restrições de autorização, mesa de destino e status da comanda.
- Proteção contra inserir, editar ou remover itens e ajustes de contas encerradas.
- Cancelamento e fechamento liberam mesa somente quando não há comandas remanescentes.
- Reserva de mesa protegida e agrupamento/transferência legados impedidos em cenários incompatíveis.

## Validação
- GitHub Actions executa `npm run lint`, `npm test`, `npm run build`.
- Job `postgres-migracao` cria PostgreSQL 17 efêmero, aplica `docs/sql/migracao-comandas-multiplas-homologacao.sql` e testa abertura de três contas na mesma mesa; transferência parcial e integral; conservação dos valores; bloqueio de transferência entre mesas ou para conta encerrada; cancelamento e fechamento independente.
- Execução aprovada: https://github.com/DeniSantos83/santo-espetinho/actions/runs/45990570326

## Antes da produção
- O PostgreSQL efêmero usa **esquema mínimo de teste e autenticação simulada**. É necessário validar compatibilidade integral com os triggers, políticas RLS e fluxos do Supabase real; não é teste completo de produção.
- Backup, testes de permissões por perfil, concorrência e conferência de relatórios financeiros são necessários.
- O índice único `comandas_mesa_aberta_unique` **continua ativo na produção**.
- Não aplicar a migração diretamente no Supabase de produção nem fazer merge do PR até a homologação de ponta a ponta.
