# NestLocal — implantação rastreável do Diagnóstico 15/10/2026

## Estado atualizado em 19/10/2026

Complemento sem novo serviço: importação local de ZIP com seleção explícita de TXT/imagem/PDF/áudio, CRC e limites de descompactação; TXT direto. Total de 499 testes e navegador real em 320/390/1440 px. Serviços → Melhorias futuras registra também as dependências do WhatsApp oficial, ASR e provas em conta/aparelho. Não altera os gates externos nem certifica restauração.

**Incremento de 19/10:** mesclagem auditada/reversível de clientes; OCR local de imagem/PDF e áudio com transcrição manual; sincronização Google nos dois sentidos **manual e revisada**; Web Push padrão para eventos de novos pedidos, sem novo fornecedor/agendador pago. Ver [contratos, provas e limites](./CUSTOMER_MEDIA_CALENDAR_PUSH_2026-10-19.md). Os estados anteriores abaixo são históricos: não usar a lista antiga de pendências como se esses incrementos não existissem. Conta Google real, entrega em aparelho, ASR automático, despacho oficial Connect e restauração real não foram certificados. Consultar CI/deploy no SHA final antes de chamar este incremento de publicado.

**Decisão do responsável:** iniciar com custo zero. Backup gerenciado e restauração pagos ficam adiados até haver lucro e aprovação explícita de custos, registrados em **Serviços → Melhorias futuras** para a administração do ecossistema. Nenhuma ativação automática foi autorizada. As demais entregas devem respeitar essa restrição. C20 continua sem certificação de recuperação; está adiado por decisão de produto, não encerrado como implementado.

As seções históricas abaixo registram os gates existentes em cada entrega. Para a situação atual, prevalecem as evidências desta seção:

- **Publicado:** perfis operações, campo, financeiro e consulta, com autorização canônica no servidor. Campo acessa apenas trabalhos atribuídos, com projeção sem valores e teste de revogação; financeiro altera somente os campos financeiros permitidos. Matriz negativa e navegação em 320/390/1440 px passaram com API real e Firestore emulado. Ver [matriz de perfis](./OPERATIONAL_PROFILES_2026-10-18.md). Isso não certifica dispositivos físicos ou todos os serviços externos do ecossistema.
- **Recuperação:** manifesto schema 2 aceita restauração em um banco nomeado isolado no mesmo projeto; nunca no banco de origem. A sondagem administrativa de produção [39091758309](https://github.com/prdanielcunha/nestlocal/actions/runs/39091758309) encontrou PITR desabilitado, zero agendamentos e zero backups gerenciados para o banco `(default)` em `nam5`. Exportações para buckets não foram inventariadas. Nenhum backup, banco de recuperação ou serviço pago foi criado; restauração real continua pendente.
- **Incremento de importação:** revisão local de conversa `.txt` em UTF-8, até 64 KiB, com seleção explícita de até 6.000 caracteres. Não infere remetente, identidade, preço ou consentimento. O trecho só chega ao servidor quando o operador salva a oportunidade; IA mantém sua autorização separada. PDF, ZIP, áudio e imagem continuam pendentes. Rascunhos agora preservam os 6.000 caracteres permitidos durante redesenhos da tela.
- **C19 — locais/equipamentos em lote:** importação CSV/TSV por cliente, com modelo, cabeçalhos PT/EN/ES, linhas agrupadas por local, prévia e confirmação atômica. Equipamentos repetidos, conflitos, capacidade excedida e prévia obsoleta bloqueiam o lote; recibos tornam retentativas idempotentes. Nenhum local ou histórico existente é sobrescrito. Ver [contrato e validação](./CUSTOMER_SITE_BATCH_IMPORT_2026-10-18.md). Conferir CI e publicação no SHA final antes de declarar disponível.
- **Ainda não homologado:** backup e restauração reais, push com app fechado em aparelhos físicos, entrega/recibos oficiais de WhatsApp via Connect, agenda bidirecional, importação multimodal, mesclagem auditada de identidades, conciliação com provedor e piloto operacional. Testes sintéticos não encerram esses itens.

## Evidência adicional em 16/10/2026

A [suíte autenticada de API com Firestore emulado](./NESTLOCAL_FIRESTORE_INTEGRATION_2026-10-16.md) passou em sete cenários: capacidade, isolamento de organização/permissão financeira, revogação de membro, pagamentos concorrentes/reversão manual, correção de receita por diferença, 125 pedidos paginados e consentimento público. Não são mocks de banco; não são dados reais de produção. `npm run check`: 453 aprovados. Conferir também o novo workflow no SHA final.

Foram encontradas e corrigidas gravações com chaves literais pontuadas em capacidade, habilitação de membro e consentimento. O PR #129 separa essas correções da reformulação ampla, incluindo o bloqueio por `sourceDraftId` indefinido no pedido público. A liberação ampla continua condicionada às pendências de dados reais, infraestrutura, recuperação e aparelhos; não declarar C02/C08/C13/C14/C20/C21 integralmente homologados.

Origem: *NestLocal — Diagnóstico e plano de melhoria*, versão 1.0, 22 páginas.
Auditoria de referência: `ef7e16ed3595c596f7479d49335a21e436bd0764`.
Implementação: [PR #128](https://github.com/prdanielcunha/nestlocal/pull/128) em branch isolada.

> **Importante:** "Código aplicado" não significa homologação integral, merge ou deploy. `main` e `production` não devem ser avançadas até satisfazer o portão de liberação do relatório.

## Matriz de execução C01–C21

| ID | Prioridade | Implementação na branch | Próximo portão de aceitação |
|---|---|---|---|
| C01 | P0 | Submit explícito, estado recuperável e erro persistente nos dois formulários | E2E autenticado com falha de rede, teclado e confirmação em banco |
| C02 | P0 | Contagens reais, filtros/paginação, prioridades por situação, agenda com reservas e pedidos históricos sem slot e testes sintéticos >100; a tela Hoje rotula receita amostral como mínimo e oculta conversão global não verificável | Testar Firestore real, índices, concorrência, custo, agregações completas e dados legados de clientes |
| C03 | P1 | Rascunho público preservado ao trocar serviço; fotos retidas também com fallback móvel | E2E em iOS/Android, arquivos interrompidos e retentativa |
| C04 | P1 | Alterações em catálogo/configuração viram rascunho; publicação transacional | Teste real de edição e publish sem interrupção, concorrência e rollback |
| C05 | P1 | Inclusões/exclusões e título editáveis; escopo de serviço sob revisão protegido | Conferir serviços com modo review, campos legados e publicação de versões |
| C06 | P1 | Validade, aprovação por versão e snapshots imutáveis; proposta opcional com itens, soma em centavos e proteção contra edição simultânea, visível ao cliente/equipe | Testar expiração e edição concorrentes em Firestore, legado e frontend em cache |
| C07 | P1 | Revisão do compromisso incrementa, confirmação antiga é arquivada e link antigo não confirma versão nova | E2E de reagendamento e múltiplos dispositivos |
| C08 | P1 | **Parcial**: correção do valor concluído por diferença, trilha de caixa com revisão, histórico protegido, e verificador read-only de anomalias de execução/recebimento com páginas e eventos assistidos | Executar pré-conciliação com credenciais autorizadas, validar histórico no Firestore, parcelas/estornos de provedor e comprovante real de pagamento |
| C09 | P1 | Identificador por intenção de cadastro e retentativa idempotente da criação manual | Simulação de concorrência e perda de resposta HTTP |
| C10 | P1 | `growth` permanece plano e `navRadar` é rótulo independente PT/EN/ES | E2E das 3 línguas |
| C11 | P1 | Workflow de produção observa `src/nestai.mjs` | Verificar ação somente para alteração do adaptador |
| C12 | P1 | **Parcial**: atualização ao retomar a tela Hoje e indicador de frescor/atualização manual, com proteção contra foco em formulário | Testar edição concorrente, defasagem por módulo e custo de consultas |
| C13 | P1 | **Parcial**: endpoint de cadastro/revogação/teste FCM autenticado, serviço worker sem dados privados, UI opt-in, chaves públicas exigidas, seleção local de tarefa, executor manual/dry-run idempotente e testes; tudo desabilitado por padrão | Habilitar Firebase Messaging em homologação com segredos/IDs corretos, Cloud Run Job/Cloud Scheduler restrito, IAM/rules, consentimento e testes reais com app fechado em Android/iOS/desktop |
| C14 | P1 | **Parcial**: outbox não dispara; API/UI agora declaram explicitamente mensagens apenas preparadas, sem custo ou confirmação de entrega; contrato atual do Connect é validation-only | Connect com boundary de despacho oficial, provider autorizado, política de custos, assinaturas de webhooks e recibos sent/delivered |
| C15 | P2 | Erros públicos recuperáveis e persistentes; navegação anuncia `aria-current`; novo CSS acessível respeita foco, alvo de toque e movimento reduzido | Leitor de tela e teclado em dispositivos reais, contraste e fluxos ponta a ponta autenticados |
| C16 | P2 | **Parcial:** formulário público e rascunhos transitórios de atendimento, orçamento, agendamento, execução, manutenção, catálogo e configurações são restaurados após redesenhos sem persistir PII no navegador; limpeza ocorre após salvamento bem-sucedido | Homologar interrupções e foco/teclado em aparelhos físicos; não preservar dados após fechar a aba |
| C17 | P2 | **Parcial**: opções avançadas recolhíveis, estilos operacionais responsivos e painel de notificação progressivo sob feature flag | Reorganizar módulos restantes por tarefas, inspecionar screenshots e testar em celular com dados reais |
| C18 | P2 | Pedido interno usa perguntas/quantidade/qualificadores do catálogo compartilhado com público | Testar playbooks e validade de schema histórico |
| C19 | P2 | **Parcial**: importação com prévia, transação e auditoria; múltiplos locais/equipamentos por cliente; pedido interno agora registra vínculo de local **com revisão e snapshot imutável**, validado na mesma transação e exibido no detalhe | Faltam mesclagem auditada de identidades multicanal, importação massiva de locais/equipamentos e homologação Firestore |
| C20 | P2 | **Parcial**: manifesto read-only schema 2 com identidade de banco e comparação entre bancos isolados; inventário gerenciado de produção executado; testes e runbook | Zero backups gerenciados/agendamentos e PITR desligado na sondagem; faltam backup real, retenção e restauração isolada ensaiada |
| C21 | P2 | **Publicado, homologação parcial**: perfis operações/campo/financeiro/consulta no membro canônico; atribuição revalidada, projeção de campo, capacidades e matriz negativa API/Firestore emulado | Homologação com organizações e aparelhos físicos; verificar autoridade dos demais serviços do ecossistema |

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

## Continuação da execução em 15/10/2026 — revisão incremental

- **C02:** priorização de Hoje passou a consultar separadamente estágios operacionais, reunindo também clientes com retorno vencido; sinaliza quando existem mais resultados ou uma consulta falhou. Continua exigindo carga com histórico acima de 100 e validação de volume/custo.
- **C04/C05:** cálculo de prontidão reflete as configurações em rascunho e inclusões/exclusões são preservadas para serviços de preço fixo **e** sob avaliação.
- **C19:** confirmação de importação verifica na mesma transação o estado e a versão `updatedAt` mostrados ao operador; divergência retorna `CUSTOMER_IMPORT_PREVIEW_STALE` (409), sem importar parcialmente. Auditoria registra contagens, não nomes ou telefones.
- **Testes:** regressões adicionais para prioridades por estágio, prontidão de rascunhos e importação transacional; o trabalho continua no PR em rascunho, sem promoção para as branches públicas.

**Riscos ainda bloqueadores:** C02 não certificado com dados sintéticos acima de 100 registros; C08 carece de casos reais de conciliação; C13–C14 dependem de configuração e execução autenticada de push/Connect; C20 carece de backup/restauração ensaiada; C21 não tem papéis finos completos. O conjunto de mudanças não equivale às seis etapas concluídas.

## Continuação — rodada adicional (15/10/2026)

- **C08:** eventos manuais de pagamento agora são gravados dentro do pedido, em transação Firestore e com revisão crescente; a interface administrativa apresenta diferenças e informa que não há comprovação bancária. Correções de valor executado permanecem separadas de ajustes de valores efetivamente recebidos.
- **C21:** a nova permissão explícita `appAccess.nestlocal.permissions.financeWrite=true` permite delegar alterações monetárias sem abrir o catálogo; administradores e proprietários mantêm a permissão. O frontend evita enviar mudanças financeiras por profissionais sem esse direito, e a API revalida.
- **C02:** agenda mescla reservas e pedidos históricos agendados, incluindo casos anteriores à criação da coleção de slots. Botão de continuidade pagina as duas origens.
- **C14:** verificado no [contrato de saída do Connect](https://github.com/prdanielcunha/millionsnest-connect/blob/production/docs/OUTBOUND_DELIVERY_CONTRACT.md) que a boundary permanece validation-only e a política bloqueia custo. O NestLocal não vai simular entrega nem cobrar por envio inexistente.
- **C20:** [manual de recuperação](./NESTLOCAL_BACKUP_RECOVERY_RUNBOOK_2026-10-15.md), CLI `scripts/nestlocal-recovery-manifest.mjs` e testes para detectar diferenças em restaurações isoladas. Não há backup real executado nem declaração de RPO/RTO.
- **Validação:** confiar exclusivamente nos workflows do último SHA do PR. Uma revisão antiga aprovada não libera mudanças mais recentes. Até comprovar testes end-to-end autenticados e restauração, o PR permanece rascunho.

**Bloqueios externos concretos:** envio Connect real exige capacidade/provedor e política comercial deliberada, notificações push persistentes precisam da infraestrutura e testes em aparelhos com o app fechado, e o backup/restore real requer acesso GCP + destino isolado. Não ativar pagamento, WhatsApp ou migração a partir de testes sintéticos.

## Continuação — infraestrutura push, acessibilidade e UX premium

- **C13:** código em branch para consentimento explícito, identificação por UID/organização, token FCM privado e revogável, testes de canal sem afirmar entrega, service worker com mensagens genéricas PT/EN/ES e destino seguro. A ativação exige as variáveis `NESTLOCAL_PUSH_ENABLED`, `NESTLOCAL_WEB_PUSH_VAPID_PUBLIC_KEY`, `NESTLOCAL_FIREBASE_MESSAGING_APP_ID` e `NESTLOCAL_FIREBASE_MESSAGING_SENDER_ID`. Sem todas, o fluxo permanece desativado.
- **C13 worker:** `scripts/nestlocal-push-reminders.mjs` opera em **simulação**, exceto com `--send` e dupla aprovação de ambiente. Busca tarefas por data/fuso, verifica organização/membro/dispositivo, limita volume e reserva idempotência antes do FCM; não reenvia automaticamente em falha ambígua. **Scheduler e push em aparelhos físicos não executados.** Veja [runbook C13](./NESTLOCAL_PUSH_C13_RUNBOOK_2026-10-15.md).
- **C15/C17:** novo `web/premium-system.css` melhora foco, legibilidade, alvos de toque, hierarquia e responsividade; navegação desktop/mobile indica página ativa com `aria-current`. São melhorias incrementais, não homologação visual de todas as telas.
- **Qualidade:** testes unitários para permissões, perfil seguro do service worker, seleção de tarefas com fuso horário, idempotência, CSS e navegação; publicar status baseado no último SHA que concluir todos os workflows.
- **Gates bloqueados:** Firebase Messaging e Cloud Scheduler sem provisionamento validado, Connect ainda validation-only, backup e restauração reais pendentes, testes autenticados com clientes legados e inspeção física indisponíveis. Não promover esta branch para produção apenas por CI verde.

## Continuação C16 e integridade dos indicadores — 15/10/2026

- **C16:** novo módulo `web/transient-form-drafts.js` mantém apenas em memória os campos editáveis não sensíveis (senhas, anexos e inputs escondidos ficam excluídos). A chave considera usuário, organização e formulário; não há uso de `localStorage`, `sessionStorage`, links, logs ou backend para guardar esses rascunhos. O conteúdo é descartado depois de o servidor confirmar salvamento e ao sair/trocar de conta. Esta proteção não sobrevive ao fechamento da aba.
- **C02:** valores da tela Hoje derivados dos primeiros 100 pedidos deixam de ser apresentados como totais integrais; saldos abertos mostram o limite inferior e taxas de conversão incompletas aparecem como indisponíveis. A fila de reativação usa também clientes com retorno vencido consultados em separado.
- **QA:** testes unitários da recuperação e dos indicadores, com cenário de Playwright para simular preenchimento não enviado, navegação entre páginas e verificação de não persistência a 320/390/1440 px. Resultado de CI deve ser conferido no SHA correspondente; isso não substitui dispositivo físico nem validação com clientes.

## Continuação — ferramentas de execução e orçamento profissional

- **Etapa 3, checklist por serviço:** `src/domain/field-checklist.mjs` valida até 20 etapas nomeadas/ordenadas e seu estado de conclusão. A interface permite criar, editar, excluir e marcar tarefas no celular. API registra operador/data e salva por pedido; não precisa migrar dados antigos nem altera pagamento.
- **Etapa 3, orçamento itemizado:** `src/domain/quote-items.mjs` valida até 20 linhas opcionais, descrições, quantidade, preço unitário e soma exata em centavos. Divergências são rejeitadas. O fluxo legado de orçamento por valor único continua permitido. Novas revisões arquivam os itens; o acompanhamento privado do cliente e o detalhe interno os apresentam.
- **C06, concorrência:** atualizações manuais incluem a revisão vista pelo operador. A API rejeita edição obsoleta via `QUOTE_REVISION_CHANGED` (409), evitando sobrescrita silenciosa.
- **Testes:** `test/field-checklist.test.mjs`, `test/quote-items.test.mjs`; checagem de sintaxe integrada ao comando `npm run check`. CI sintético não substitui E2E autenticado nem testes de campo.

**Permanecem abertos:** recuperação real (C20); push com aplicativo fechado (C13); envio e recibos oficiais do Connect (C14); conciliação e volumetria em Firestore real (C02/C08); permissões multiempresa (C21), equipamentos/locais, telas restantes e o piloto final. O PR segue em homologação, sem publicar dados ou alterar Stripe.

## Continuação — clientes com múltiplos locais e equipamentos

- **C19/Etapa 3:** em cada cliente, a equipe pode consultar sob demanda até 20 locais, cada um com endereço, observações e até 20 equipamentos nomeados. Os dados são uma subcoleção do cliente, separados da identidade principal e do histórico de pedidos. Nenhum endereço antigo é sobrescrito.
- **Segurança C21:** inclusão/edição exige proprietário/administrador ou permissão explícita `appAccess.nestlocal.permissions.sitesWrite`; leitura mantém a autorização organizacional atual. Criação usa transação com limite; edição usa revisão esperada e retorna 409 se outro operador alterou o registro. Operações têm auditoria sem endereço, telefone ou equipamento nos eventos.
- **UX C16:** locais são carregados somente ao abrir o cliente, evitando custo por lista completa; formulários são acessíveis em telas pequenas e preservam alterações não salvas na memória da sessão, sem localStorage. Caches de locais e rascunhos são apagados ao sair ou trocar de organização.
- **QA:** `test/customer-sites.test.mjs` testa formato, limites, isolamento, permissões e controle de concorrência de forma sintética. Ainda não é validação com Firestore real nem implica que equipamentos já estejam ligados automaticamente à agenda, orçamento e execução.

**Não confundir a existência da ferramenta com cobertura completa da gestão de ativos:** múltiplos locais/equipamentos estão disponíveis como registros independentes na branch, mas seleção direta no novo pedido, histórico individual por equipamento, importação em massa e testes de dispositivo real permanecem por desenvolver/homologar.

### Integração incremental locais → pedido

O botão **Criar pedido neste local** na ficha do cliente reaproveita nome/telefone e endereço/cidade registrados, abre a criação de pedido e mantém a escolha do serviço e da área atendida para confirmação humana. Não modifica pedidos anteriores, não força correspondência de cidade com cobertura e preserva o rascunho na memória. Continua faltando associar um equipamento individual a cada execução/contrato e testar end-to-end autenticado com sites antigos.

### Resiliência de locais contra dupla submissão (C09/C19)

A criação de um local usa identificador determinístico derivado da identidade do cliente e dos dados de identificação/endereço normalizados. Uma retentativa com o mesmo conteúdo retorna o registro existente sem incrementar `siteCount` nem duplicar o evento de auditoria; um mesmo identificador com conteúdo divergente retorna 409 e pede edição explícita. A edição preserva o controle de revisão. Validação concorrente Firestore real segue pendente.

## Continuação em 16/10/2026 — vínculo pedido ↔ local cadastrado

- **C19:** novo módulo `src/domain/customer-site-request.mjs`. O fluxo **Criar pedido neste local** agora envia ID do local e revisão selecionada. A API confere que o local pertence ao mesmo cliente e organização, que a revisão é atual e que o endereço ainda coincide. Isso acontece na **mesma transação Firestore** que cria o pedido; nenhuma alteração é feita nos pedidos históricos.
- O novo registro contém um **snapshot imutável** do rótulo, revisão e equipamentos do local, separado dos dados pessoais do cliente, e visível apenas no detalhe interno do pedido. Alterações posteriores no local não reescrevem o orçamento nem o histórico.
- **C09:** a chave de intenção continua idempotente, mas o fingerprint de conteúdo da nova versão inclui quantidade, qualificadores, respostas da ficha e o local selecionado; um retry antigo continua compatível por fallback de esquema.
- **UX:** se o operador alterar manualmente os dados da localização, o formulário remove o vínculo obsoleto. Edição concorrente dispara erro explicativo PT/EN/ES.
- **Ainda pendente:** testes reais de concorrência usando duas sessões autenticadas, idempotência sob perda de conexão em produção e escolha granular do equipamento a ser atendido. `main`/`production` continuam isoladas.

### Incremento C19: equipamento específico no pedido
- O formulário de novo pedido apresenta uma seleção opcional dos equipamentos cadastrados para o local escolhido, com uma opção clara de “Não especificado”, nos três idiomas.
- O domínio `customerSiteRequestSnapshot` inclui `selectedEquipment` apenas quando a escolha faz parte da lista revisada de equipamentos e a revisão do local coincide; não assume que todos os equipamentos cadastrados serão atendidos.
- O detalhe do pedido exibe o equipamento escolhido e a lista do local como contexto separado. A rejeição `CUSTOMER_SITE_EQUIPMENT_CHANGED` orienta recarregar o local.
- **Ainda não homologado:** múltiplos equipamentos no mesmo pedido, catálogo de equipamentos com número de série/foto/histórico, e integração real com Firestore sob concorrência.

## Continuação — 16/10/2026: pré-conciliação C08

- Criados `src/domain/financial-reconciliation.mjs`, `scripts/nestlocal-finance-preflight.mjs` e `test/financial-reconciliation.test.mjs` para detectar divergências de valor executado, pagamento manual, histórico sem marcador e atribuição de receita assistida. O scanner lê páginas de até 100, exige projeto e organização explícitos, e informa quando o limite impede varredura integral. Nunca grava no banco.
- Verificar a execução operacional no [runbook financeiro](./NESTLOCAL_FINANCIAL_PREFLIGHT_C08_2026-10-16.md). Sem credenciais ADC e dados reais não há reconciliação histórica certificada nem evidência bancária.
- `npm run check` agora inclui a sintaxe dos novos arquivos. A CI unitária foi exercitada; conferir status no último SHA. **Não promover o PR enquanto C08/C02/C20 e os demais gates críticos permanecerem abertos.**
