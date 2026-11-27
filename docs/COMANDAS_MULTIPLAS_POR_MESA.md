# Evolução: múltiplas comandas por mesa

**Status: proposta técnica / não implantado.** Proteger a operação em produção. Referência: ZIP do projeto e branch `main` verificados em 27/11/2026. Nenhuma migração deve ser executada sem inspecionar as restrições reais do banco e fazer backup.

## Objetivo
Uma mesa física pode ter uma ou várias comandas abertas, com saldos separados por pessoa/grupo, sem perder o modo atual de comanda coletiva.

## Regras de negócio
- Mesa é recurso físico, com estado `ocupada` enquanto existir **qualquer** comanda aberta vinculada. Só fica `livre` quando a última comanda da mesa é fechada, e se não houver reserva/agrupamento que exija outro estado.
- Comanda tem identificador próprio; `cliente` ou `apelido` é um rótulo, não uma nova mesa. `mesa_id` continua como referência.
- Permitir uma comanda coletiva ou várias individuais na mesma mesa; criar uma comanda adicional NÃO deve recusar pelo fato de já existir outra.
- O garçom seleciona primeiro a mesa e depois a comanda, podendo criar uma nova comanda nessa mesa.
- Itens `comanda_itens` continuam vinculados a `comanda_id`; o total de uma comanda NÃO agrega itens de outras.
- Fechar uma comanda NÃO fecha nem libera as outras. O histórico e o relatório mantêm cada fechamento individual.
- Pré-conta por comanda e resumo consolidado por mesa devem ser distinguíveis.
- Não permitir adicionar produtos a uma comanda fechada; lidar com dois funcionários abrindo/fechando simultaneamente.
- Descontos e acréscimos pertencem à comanda correta.
- Para item compartilhado, distribuir valores monetários em centavos sem perda por arredondamento; evitar duplicar o item original.

## Código atual que exige adaptação
1. `src/pages/garcom/ComandaPage.jsx`: `criarComanda` usa `.eq("mesa_id", ...).eq("status", "aberta").maybeSingle()` e recusa conta adicional; `obterComandaDaMesa` usa `find` e supõe uma única comanda.
2. `src/pages/admin/ComandasPage.jsx`: reservas, transferência e junção de mesas possuem `maybeSingle()` para comanda por mesa, e seus estados dependem de uma única conta.
3. `src/components/comandas/FecharComandaModal.jsx`: fecha comanda e depois executa `update mesas set status='livre'` em segunda chamada: essa lógica deve ser substituída por operação atômica no banco.
4. `src/components/comandas/GerenciarComandaModal.jsx`: já opera por `comanda.id`, podendo ser reaproveitado com ajustes de navegação.
5. `src/pages/gerente/DashboardGerente.jsx`: compartilha a tela de comandas do administrador; testes de permissão são obrigatórios.
6. `src/pages/shared/RelatoriosPage.jsx`: manter faturamento por comanda fechada, sem contar totais consolidados da mesa duas vezes.

## Etapas técnicas
**Fase 0 — inventário do esquema e backup.**
Executar consultas SOMENTE leitura para detectar constraint/índice UNIQUE de comanda aberta por mesa, tipos das colunas, FKs, triggers, funções, RLS, políticas e estado atual. Exemplo de inventário: `docs/sql/preflight-comandas-por-mesa.sql`. O Supabase estava inacessível durante esta análise, portanto não se pode assumir que não há constraint impedindo a mudança.

**Fase 1 — banco + operações atômicas (não aplicar sem preflight).**
- Revisar unicidade em `comandas`; preservar PK de `id` e FK de `mesa_id`. Remover SOMENTE a restrição que impuser 1 comanda aberta/mesa após identificar o nome real e as dependências; não remover índices indiscriminadamente.
- Indexar `(mesa_id, status)` para listagem por mesa.
- Implementar RPC segura `abrir_comanda_na_mesa` validando mesa ativa, ocupação, reserva, sessão/perfil e aplicando estado da mesa numa mesma transação.
- Implementar RPC segura `fechar_comanda_individual`: travar mesa e comanda, validar situação, calcular total no servidor, fechar comanda e liberar mesa somente se NÃO restarem contas abertas. A função deve tratar concorrência por bloqueio, e autorização deve estar no banco (não somente no React).
- Rever RPCs/ações de reserva, transferir, juntar e separar mesas; não usar `.maybeSingle()` onde mais de uma comanda é permitida.
- RLS: permitir ações apenas aos perfis autorizados (garçom, gerente e administrador, de acordo com políticas existentes). Nunca inserir `service_role` no frontend.

**Fase 2 — frontend (MVP).**
- Tela de mesa: contador de comandas abertas, total agregado (informativo), lista de titulares/apelidos e **+ Nova comanda**.
- Ao tocar uma comanda: abrir `GerenciarComandaModal` com `comanda.id`.
- Reutilizar `FecharComandaModal` por comanda; mostrar aviso quando ainda restarem outras abertas na mesa.
- Manter opção **Comanda coletiva** como comportamento padrão para mesas simples.
- Visualizações admin/gerente/garçom consistentes em mobile/desktop.

**Fase 3 — transferência/divisão de itens.**
- RPC atômica de transferir quantidade parcial de item entre comandas abertas; preservar preço original, observação e trilha de auditoria.
- RPC atômica para ratear valor de item compartilhado entre comandas, em centavos, com arredondamento e conciliação; registrar origem para evitar venda duplicada.
- Testar cancelamento, correção de erros e resistência a cliques repetidos.

## Critérios de aceite
- Mesa 05 possui 3 comandas abertas e totais individuais distintos.
- Garçom lança item na comanda correta sem afetar outras.
- Fechar uma comanda deixa a mesa `ocupada` se restarem duas.
- Fechar última comanda libera a mesa se não houver reserva/agrupamento conflitante.
- Dois funcionários criando/fechando simultaneamente não deixam mesa livre com conta aberta.
- Pré-contas individuais e relatório do dia não duplicam valores.
- Reserva, junção e transferência de mesas passam por testes de regressão.
- Administração e gerência seguem com as permissões atuais.
- Deploy somente após backup, migração homologada e testes `npm run lint` / `npm run build`.

## Estado desta proposta
Documentação de implementação criada em branch separada. **Nenhum dado do Supabase foi alterado e a funcionalidade ainda não está ativa.**
