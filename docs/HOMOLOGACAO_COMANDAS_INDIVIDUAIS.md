# Plano de homologação — Comandas individuais por mesa

**Não executar na produção.** A migração SQL está em `docs/sql/migracao-comandas-multiplas-homologacao.sql` e contém a retirada do índice `comandas_mesa_aberta_unique`. Ela exige ambiente Supabase isolado, backup e testes de regressão.

## Situação verificada em 27/11/2026
- Código de abertura e fechamento RPC preparado na branch `feature/comandas-multiplas-por-mesa`.
- Índice único em produção confirmado: `comandas_mesa_aberta_unique`, condição `status='aberta'`.
- Três RPCs preparadas: `abrir_comanda_na_mesa`, `fechar_comanda_individual`, `cancelar_comanda_individual`.
- Política RLS existente usa `app_private.perfil_atual()`. RPC usa `SECURITY INVOKER` e confere usuário/perfil.
- Não executar migração antes de criar banco de homologação e conferir permissões.
- Para a branch de banco Supabase existe **cobrança por compute**, que requer autorização explícita do titular antes de criá-la.

## Passos em homologação
1. Clonar ou criar projeto Supabase de teste sem dados sensíveis; configurar variáveis locais apontando para o projeto de homologação (não usar a produção).
2. Inspecionar índices e constraints e gerar backup do projeto principal.
3. Aplicar migração SQL **somente** no banco de teste; confirmar índice removido, novo índice presente e três funções executáveis pelo papel autorizado.
4. Criar mesa teste A e funcionário de teste autorizado, autenticar e abrir 3 comandas (Ana, Bruno, Carla) **na mesma mesa**.
5. Adicionar consumo a cada comanda; conferir totais distintos, observações e pré-contas individuais.
6. Fechar Bruno: a mesa deve continuar `ocupada` e Ana e Carla devem permanecer abertas.
7. Cancelar uma comanda vazia: só ela some das contas abertas e a mesa continua ocupada.
8. Tentar cancelar conta com itens: transação deve recusar sem alterar status ou consumo.
9. Fechar última conta: mesa deve ficar livre se não houver conflito de reserva/agrupamento.
10. Com duas sessões simultâneas, abrir e fechar contas em paralelo; garantir que não exista mesa livre com comanda aberta.
11. Testar reserva ativa: garçom não pode atropelar reserva; gerente/administrador podem atender a reserva pelo fluxo previsto.
12. Testar mesa agrupada e operações de transferir/juntar/separar: bloquear operações incompatíveis; não perder itens nem vinculações.
13. Conferir relatórios e histórico após vários fechamentos: faturamento é soma de contas fechadas, não somado novamente por mesa.
14. Verificar RLS com contas garçom, gerente e administrador e com usuário sem sessão.
15. Rodar `npm run lint`, `npm run build` e teste visual em celular e desktop.
16. Só depois preparar plano de migração/rollback e publicar com janela de manutenção, preservando cadastros reais.

## Limitações desta fase
- **Não liberado para produção**: banco principal ainda tem índice de 1 comanda aberta por mesa.
- Junção e transferência de mesas ainda usam trechos antigos que pressupõem uma única comanda; NÃO operá-las com grupos de contas até adaptar fluxos de ponta a ponta.
- Divisão e transferência de **itens entre comandas** não fazem parte do MVP atual.
- Os valores exibidos no app devem ser conferidos pelo servidor no fechamento, não confiados ao cliente.
- Realizar testes de concorrência e permissão antes de promover alterações do banco.
