# Iniciar interface local com isolamento de banco

## Aviso essencial
O projeto possui um `.env` versionado que aponta para o Supabase remoto. Por isso, **`npm run dev` sozinho NÃO é um ambiente isolado**.

Para testar sem tocar os pedidos reais, use **somente** `npm run dev:homologacao`.
Esse modo verifica a URL e não inicia se não apontar para `http://127.0.0.1:54321`.

## Configuração (PowerShell, Windows)
```powershell
cd C:\Users\ll3868\Documents\vscode\Espetaria-comandas
git status
git pull origin feature/comandas-multiplas-por-mesa
npx supabase start
npx supabase status
```

Crie o arquivo **.env.homologacao.local** (ignorado pelo Git), com os dados mostrados por `npx supabase status`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=COLE_A_CHAVE_PUBLISHABLE_LOCAL_AQUI
```

**Use a chave `Publishable` local, jamais a `Secret`**.
Não envie a chave em mensagens. O comando de inicialização é:

```powershell
npm run dev:homologacao
```

O Vite usa a rota `/santo-espetinho/`; abra a URL apresentada no terminal. A chave local e o endereço são exclusivos do ambiente de desenvolvimento.

## Banco de dados ainda vazio
O Supabase local já iniciou anteriormente, mas **não possui as tabelas da aplicação**. Assim, a tela de login ou consultas pode apresentar erros de tabela ausente. Isso **não deve ser contornado voltando a apontar o navegador para produção**.

O SQL `docs/sql/migracao-comandas-multiplas-homologacao.sql` é uma **migração incremental**: depende da estrutura original do sistema. O arquivo `tests/sql/schema_minimo.sql` simula somente o necessário ao teste de PostgreSQL do CI, **não serve para executar a aplicação inteira e altera uma função mock de auth.uid()**. NÃO execute esse arquivo no Supabase local real.

Próximo bloqueio: importar/gerar uma **cópia somente do esquema** de produção, por mecanismo de leitura (sem copiar registros de clientes), validar políticas RLS e criar perfis de teste locais. A Supabase CLI remota falhou antes por timeout/firewall, então não dependa dela para iniciar o Vite.

## Segurança
Não rode `db push`, `db reset --linked`, `migration up --linked` ou aplique a migração em produção. Não compartilhe credenciais e não use o `.env` de produção para testar mutações.
