# Homologação local sem upgrade Supabase Pro

**Situação:** a criação de branch remota pelo conector Supabase retornou: `Branching is supported only on the Pro plan or above`. Nenhuma branch foi criada e **nenhuma migração foi aplicada ao banco em produção**.

## Alternativa recomendada (Windows 11)
Usar Supabase CLI + Docker Desktop em uma cópia local do repositório. Requer Docker funcionando, Node.js e espaço para containers. Referência: https://supabase.com/docs/guides/local-development .

1. Abrir a branch do GitHub **somente na cópia local**:
   ```powershell
   git fetch origin
   git switch feature/comandas-multiplas-por-mesa
   git pull origin feature/comandas-multiplas-por-mesa
   ```
2. Verificar ferramentas:
   ```powershell
   docker --version
   npx supabase --version
   npx supabase start
   npx supabase status
   ```
3. **O ZIP analisado não contém migrações SQL em `supabase/migrations`**. Antes de testar, é necessário trazer o **esquema** do projeto Supabase para a instância local. A CLI documenta o fluxo de conectar projeto e executar `supabase db pull` para gerar uma migração local. Isso usa credenciais do projeto; não incluir senha/URL com chaves secretas no Git e **não executar `supabase db push`**, `supabase db reset --linked` ou `supabase migration up --linked`.
4. Conferir se o banco local possui `public.comandas`, `public.mesas`, `public.reservas_mesas`, `public.comanda_itens` e as RLS/funções necessárias antes de aplicar qualquer SQL.
5. No SQL Editor do Studio **LOCAL** (a URL está em `npx supabase status`), aplicar somente `docs/sql/migracao-comandas-multiplas-homologacao.sql`. O script espera o índice `comandas_mesa_aberta_unique`.
6. Criar no banco local funcionários de teste com autenticação apropriada. As RPCs usam `auth.uid()` e RLS; tentar abrir/fechar via SQL Editor como superusuário não equivale a um teste de autorização pelo aplicativo.
7. Criar `.env.local` apontando à **URL local** e à chave publicável local retornadas por `supabase status`. Não compartilhar valores de segredo. Revisar os nomes exatos de variáveis usados em `src/lib/supabase.js` antes de preencher. Nunca apontar o frontend de homologação para o banco remoto de produção.
8. Executar `npm run lint`, `npm run build` e `npm run dev`. Seguir `docs/HOMOLOGACAO_COMANDAS_INDIVIDUAIS.md`, especialmente as contas separadas, reservas, cancelamento e concorrência.
9. Finalizar os containers locais: `npx supabase stop`.

### Bloqueios antes de publicação
- A migração precisa ser testada em PostgreSQL de homologação; os testes GitHub Actions só verificam lint e build.
- O sistema ainda não oferece transferência e rateio de **itens** entre comandas.
- A lógica legada de transferir/juntar mesas precisa de testes funcionais extensos; a versão de desenvolvimento bloqueia os cenários incompatíveis.
- Não aplicar o SQL no Supabase de produção só para testar. Preparar backup e janela de implantação depois que o MVP for aprovado.

### Observação sobre versões
Descobrir argumentos atuais usando `npx supabase --help`, `npx supabase db --help`, `npx supabase db pull --help` antes de executar comandos de sincronização, pois a CLI pode mudar.
