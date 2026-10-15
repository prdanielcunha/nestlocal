# NestLocal — implantação rastreável do Diagnóstico 15/10/2026

Origem: *NestLocal — Diagnóstico e plano de melhoria*, versão 1.0, 22 páginas.
Auditoria de referência: `ef7e16ed3595c596f7479d49335a21e436bd0764`.
Implementação: [PR #128](https://github.com/prdanielcunha/nestlocal/pull/128) em branch isolada.

> **Importante:** "Código aplicado" não significa homologação integral, merge ou deploy. `main` e `production` não devem ser avançadas até satisfazer o portão de liberação do relatório.

## Matriz de execução C01–C21

| ID | Prioridade | Implementação na branch | Próximo portão de aceitação |
|---|---|---|---|
| C01 | P0 | Submit explícito, estado recuperável e erro persistente nos dois formulários | E2E autenticado com falha de rede, teclado e confirmação em banco |
| C02 | P0 | Totais reais, filtro por status/paginação, leitura de pedidos antigos, agenda por reservas com paginação e prioridade por status + vencimentos | Validar com >100 pedidos/clientes, agenda histórica sem slots e prioritização completa em concorrência |
| C03 | P1 | Rascunho público preservado ao trocar serviço; fotos retidas também com fallback móvel | E2E em iOS/Android, arquivos interrompidos e retentativa |
| C04 | P1 | Alterações em catálogo/configuração viram rascunho; publicação transacional | Teste real de edição e publish sem interrupção, concorrência e rollback |
| C05 | P1 | Inclusões/exclusões e título editáveis; escopo de serviço sob revisão protegido | Conferir serviços com modo review, campos legados e publicação de versões |
| C06 | P1 | Validade configurável, bloqueio de aprovação vencida na API pública e interna, comparação de versão e snapshots imutáveis das revisões manuais | Testar expiração concorrente, renovação, histórico legado e frontend em cache |
| C07 | P1 | Revisão do compromisso incrementa, confirmação antiga é arquivada e link antigo não confirma versão nova | E2E de reagendamento e múltiplos dispositivos |
| C08 | P1 | **Parcial**: ajuste por diferença de serviço concluído, agregados reconciliados quando conhecidos, auditoria imutável e erro seguro para legado inconsistente | Falta fluxo de estorno/parcela, reconciliação histórica, teste integrado Firebase e separação explícita caixa vs. execução |
| C09 | P1 | Identificador por intenção de cadastro e retentativa idempotente da criação manual | Simulação de concorrência e perda de resposta HTTP |
| C10 | P1 | `growth` permanece plano e `navRadar` é rótulo independente PT/EN/ES | E2E das 3 línguas |
| C11 | P1 | Workflow de produção observa `src/nestai.mjs` | Verificar ação somente para alteração do adaptador |
| C12 | P1 | **Parcial**: atualização ao retomar a tela Hoje e indicador de frescor/atualização manual, com proteção contra foco em formulário | Testar edição concorrente, defasagem por módulo e custo de consultas |
| C13 | P1 | **Pendente** | Push real com app fechado, permissões e aparelhos físicos |
| C14 | P1 | **Pendente** | Transporte Connect validado, recibos `sent/delivered` e fallback manual |
| C15 | P2 | Erros públicos distintos e recuperáveis, região viva e falhas persistentes nos formulários críticos | Leitor de tela, foco/teclado, textos de erro em todos os fluxos |
| C16 | P2 | Preservação iniciada pelo formulário público | Unificar controle de rascunho/foco nas demais telas |
| C17 | P2 | **Parcial**: opções avançadas de modelos de mensagem recolhíveis, sem bloquear o uso manual | Reorganizar módulos de configuração em áreas e testar mobile |
| C18 | P2 | Pedido interno usa perguntas/quantidade/qualificadores do catálogo compartilhado com público | Testar playbooks e validade de schema histórico |
| C19 | P2 | **Parcial**: prévia de importação por linha, contagem de novos/atualizações/duplicados e confirmação explícita | Falta mesclagem auditada de identidades multicanal e importação de equipamentos/locais |
| C20 | P2 | **Pendente** | Política de backups reais e ensaio de restauração em ambiente isolado |
| C21 | P2 | **Parcial**: gestão de configurações/capacidade/catálogo/publicação restrita no servidor a administrador/proprietário; UI sinaliza permissão | Requer matriz granular de atendimento/campo/financeiro/consulta e testes negativos completos |

**Correção adicional:** a criação pública de pedido referenciava `sourceDraftId` não definido; removida a referência no fluxo público.

## Sequência obrigatória de entrega

1. **Etapa 0 — ambiente de validação:** revisar backups, dados sintéticos, baseline, contratos Hub/NestAI/Connect e chaves de feature flag.
2. **Etapa 1 — confiabilidade:** concluir C02/C08 e aprovar C01–C11 em testes unitários, integração, navegador e dados de legado.
3. **Etapa 2 — UX premium:** redesenhar onboarding, Hoje, Pedidos e detalhe sem reescrever o framework, usando tokens e componentes acessíveis.
4. **Etapa 3 — ferramentas:** orçamento com itens e revisão, agenda com capacidade e duração, checklist de campo, múltiplos locais/equipamentos, financeiro reconciliável.
5. **Etapa 4 — automação/IA:** regras persistentes e deduplicadas, transportes comprovados, push, governança por organização e assistência com revisão humana.
6. **Etapa 5 — piloto e produção:** liberar por organização, medir conversão, estabilidade, custos e Core Web Vitals antes de expandir.

## Gates antes de merge para `main` e `production`

- Nenhum P0 aberto; P1 residual explicitamente avaliado e funcionalidade afetada isolada.
- `npm run check`, E2E autenticado, perfis diferentes, dados com >100 pedidos/clientes, testes de expiração, duplicidade, conflitos e reconciliação.
- Smoke test no celular e desktop; PT/EN/ES; segurança de links públicos e permissões.
- Snapshots de dados, reversão ensaiada e monitoramento; **sem migrações destrutivas**.
- Preservar login Google nativo, Hub/entitlement, integração NestAI SDK, Connect, trial e cobrança comercial vigente.
- Não alterar Stripe nem planos automaticamente. Cota e preço canônicos são decididos no Hub.
- Só relatar "deploy em produção" após conferir workflow, revisão publicada e navegação real.

## Indicadores

Comparar tempo até primeiro pedido, sucesso das tarefas, incidentes de salvamento, total/pendência por período, agendas não confirmadas, receita executada vs. recebida, execução de regras, custo e aceite das sugestões IA. Registrar amostra, período, dispositivo e versão; não inventar melhorias percentuais.

## Progresso adicional — 15/10/2026

- A UI de Pedidos agora expõe filtros de status e paginação. A agenda consulta reservas próprias e sinaliza falha de atualização, sem afirmar que 100 registros são o universo completo.
- A tela Hoje também consulta prioridades por status e clientes vencidos fora da amostra principal. Ainda é necessário testar profundidade e completude com volumes reais e índices Firestore.
- A importação de clientes oferece conferência explícita antes de gravar, mas não substitui deduplicação de telefone e e-mail nem mesclagem auditada.
- Propostas manuais passam a gravar snapshots versionados. A confirmação do cliente informa a revisão visualizada e o servidor rejeita aprovação obsoleta.
- O tratamento financeiro não transforma valor executado em dinheiro recebido; totais legados incompatíveis bloqueiam ajuste até reconciliação.

### Funcionalidades não certificadas

Não declarar push real em segundo plano, envio oficial pelo Connect, sincronização bidirecional de agenda, conciliação bancária, restauração de backup, RBAC completo ou migração de dados antigos sem teste de integração e evidência explícita. É obrigatório testar iOS/Android e operações autenticadas além de navegador simulado.

### Próximo lote antes de produção

1. Homologar o **C02** com geração sintética de >100 registros (incluindo consultas por etapa, agenda antiga e estados conflitantes).
2. Ensaiar o **C08** com execução, alteração, pagamento, estorno, repetição de rede e saldo reconciliado.
3. Executar migração compatível e reversível de histórico de catálogo/orçamento e testar rollback.
4. Concluir notificações duráveis, transporte Connect, governança NestAI e RBAC antes de liberar os respectivos módulos.
5. Rodar regressão completa, autenticação Google/Hub, verificação cruzada de organizações, testes mobile e restauração isolada.
