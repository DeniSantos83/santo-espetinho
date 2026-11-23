# Homologação — login por usuário (23/11/2026)

## Atualizações já aplicadas no Supabase
- Campo `usuarios.login` adicionado, com índice único.
- `moyses` foi associado à conta já existente de Moyses (administrador).
- `italo` foi associado à conta já existente de Italo (gerente).
- RLS habilitada em `usuarios`, `produtos`, `categorias`, `mesas`, `comandas`, `comanda_itens`, `pagamentos` e `logs_acoes`.
- A função `login-usuario` foi publicada com proteção contra tentativas repetidas.
- Há um backup dos cadastros antigos no esquema `private_backups`.

## Ainda pendente antes de publicar
1. Testar `moyses` com sua senha **atual**; a senha requisitada `Admin@bar` **não** foi definida.
2. Na tela Usuários, usar o cadastro para criar `valdenir` (Administrador), `garcom1`, `garcom2`, `garcom3`; o e-mail interno é atribuído automaticamente e deve ser aceito pelo Auth na homologação.
3. Italo deve alterar a própria senha em sessão autenticada, ou um administrador deve atualizar sua senha no painel Auth.
4. Testar as permissões CRUD de produtos/categorias, fluxo de abertura/fechamento de comandas, reservas e pagamento, inclusive garçom.
5. Desativar os antigos usuários de teste **somente após** confirmar os seis acessos; não excluir os registros com histórico.
6. Executar `npm ci && npm run build` em ambiente com npm online.
7. Realizar deploy em produção somente após homologação.

## Observações importantes
- A função `criar-usuario` no servidor ainda exige e-mail e só aceita `gerente` e `garcom`: o formulário atual informa um e-mail técnico gerado e, após a criação, associa `login` e promove para admin, quando necessário. O processo é de duas etapas, não é atômico; verifique eventuais erros antes de tentar novamente.
- A conta Valdenir não existia na base no último levantamento. Não reutilizar a conta Italo, mesmo que seu e-mail se pareça com o nome de Valdenir.
- Senhas de funcionários são gerenciadas pelo Supabase Auth, nunca em tabelas de dados.
- Não coloque a chave `service_role` ou qualquer segredo no código público.
