# NestLocal — implantação rastreável do Diagnóstico 15/10/2026

Origem: *NestLocal — Diagnóstico e plano de melhoria*, versão 1.0, 22 páginas.
Auditoria de referência: `ef7e16ed3595c596f7479d49335a21e436bd0764`.
Implementação: [PR #128](https://github.com/prdanielcunha/nestlocal/pull/128) em branch isolada.

> **Importante:** "Código aplicado" não significa homologação integral, merge ou deploy. `main` e `production` não devem ser avançadas até satisfazer o portão de liberação do relatório.

## Matriz de execução C01–C21

| ID | Prioridade | Implementação na branch | Próximo portão de aceitação |
|---|---|---|---|
| C01 | P0 | Corrigidos botões `submit` em settings e capacity e recuperação de erro | E2E real de salvamento e falha de rede |
| C02 | P0 | Contagens reais no Firestore e paginação por cursor nas listas | Pendências por finalidade, filtros servidor e agenda por período com >100 registros |
| C03 | P1 | Rascunho de formulário público preservado na troca de serviço | E2E de troca/retorno, anexos e retentativa |
| C04 | P1 | Alterações em catálogo/configuração viram rascunho; publicação transacional | Teste real de edição e publish sem interrupção, concorrência e rollback |
| C05 | P1 | Inclusões, exclusões e título do serviço editáveis sem valor fixo destrutivo | Persistência de campos legados e prévia pública |
| C06 | P1 | Validade configurável, revisão do orçamento, bloqueio server-side de expiração e referência na decisão | Teste de renovação, edição concorrente e casos legados |
| C07 | P1 | Revisão do compromisso incrementa, confirmação antiga é arquivada e link antigo não confirma versão nova | E2E de reagendamento e múltiplos dispositivos |
| C08 | P1 | **Pendente** | Extrato de ajustes, execução vs. recebimento, conciliação de agregados e estornos idempotentes |
| C09 | P1 | Identificador por intenção de cadastro e retentativa idempotente da criação manual | Simulação de concorrência e perda de resposta HTTP |
| C10 | P1 | `growth` permanece plano e `navRadar` é rótulo independente PT/EN/ES | E2E das 3 línguas |
| C11 | P1 | Workflow de produção observa `src/nestai.mjs` | Verificar ação somente para alteração do adaptador |
| C12 | P1 | **Pendente** | Atualização por mutação/foco seletiva, com indicação de dados defasados |
| C13 | P1 | **Pendente** | Push real com app fechado, permissões e aparelhos físicos |
| C14 | P1 | **Pendente** | Transporte Connect validado, recibos `sent/delivered` e fallback manual |
| C15 | P2 | Erros públicos distinguem 404 de indisponibilidade; retry e `aria-live` | Auditoria de leitor de tela/foco e persistência de erros |
| C16 | P2 | Preservação iniciada pelo formulário público | Unificar controle de rascunho/foco nas demais telas |
| C17 | P2 | **Pendente** | Separar configurações e melhorar descobrimento de opções |
| C18 | P2 | Pedido interno usa perguntas/quantidade/qualificadores do catálogo compartilhado com público | Testar playbooks e validade de schema histórico |
| C19 | P2 | **Pendente** | Prévia de importação, deduplicação/mesclagem auditadas |
| C20 | P2 | **Pendente** | Política de backups reais e ensaio de restauração em ambiente isolado |
| C21 | P2 | **Pendente** | RBAC por ação no servidor, testes negativos entre organizações |

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
