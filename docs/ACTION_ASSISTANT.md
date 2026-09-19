# Action Assistant

## Objetivo

Transformar ações do Autopilot em abordagens prontas e explicáveis, sem criar envio automático ou dependência de IA paga.

A feature cobre inicialmente:

- follow-up de orçamento;
- cobrança de saldo pendente;
- reativação de cliente.

## Princípio

O Action Assistant usa apenas fatos já presentes no NestLocal.

Ele não estima:

- chance de fechamento;
- urgência psicológica;
- intenção do cliente;
- valor futuro;
- receita provável.

## Playbooks determinísticos

A lógica fica em:

`web/action-playbooks.js`

Cada mensagem usa somente dados conhecidos, como:

- nome do cliente;
- serviço;
- valor do orçamento;
- tempo sem avanço;
- saldo pendente;
- data de retorno.

As mensagens existem em PT, EN e ES.

## Follow-up de orçamento

O playbook só é oferecido a partir de uma ação `followup` que já foi qualificada pelo motor de Next Best Action.

Fatos possíveis:

- horas sem avanço;
- valor conhecido da proposta;
- serviço.

WhatsApp pode ser oferecido somente quando:

`messagingConsent.serviceUpdates.accepted = true`

## Reativação

O playbook usa:

- data de retorno;
- serviço/motivo de retorno quando conhecido.

WhatsApp pode ser oferecido somente quando:

`customer.messaging.consents.maintenanceReminders.accepted = true`

## Cobrança

A cobrança pode gerar texto e permitir cópia/ligação.

Ela não herda automaticamente a autorização de `serviceUpdates` ou `maintenanceReminders`.

Por isso, nesta fase:

- não mostra atalho de WhatsApp;
- não prepara mensagem oficial;
- não cria action-event de WhatsApp.

Essa restrição é deliberada até existir uma finalidade de consentimento própria para cobrança.

## Readiness do canal oficial

`officialMessageReadiness` espelha os mesmos gates do backend:

1. finalidade suportada;
2. consentimento compatível;
3. template aprovado configurado;
4. provider oficial conectado.

Categorias:

- follow-up → `service_update`;
- reativação → `maintenance_reminder`.

Quando todos os gates passam, a UI oferece:

`Preparar no canal oficial`

Esse comando chama o endpoint já existente:

`POST /api/organizations/:orgId/nestlocal/messages/prepare`

## Preparar não é enviar

Preparar:

- cria/reusa item idempotente na outbox;
- preserva target e evidence ref;
- mantém provider/categoria/template;
- não chama Meta;
- não dispara WhatsApp;
- não cria custo.

A interface informa explicitamente:

`Prepara a outbox; não envia a mensagem.`

## Registro manual

Para follow-up e reativação, quando WhatsApp está autorizado, o painel mantém a separação entre:

- abrir WhatsApp;
- registrar WhatsApp realizado.

Abrir o link não registra contato.

## UX

O painel abre como bottom sheet/modal:

- desktop: painel centralizado de largura limitada;
- mobile: sheet encostada na base;
- fatos usados visíveis;
- mensagem em textarea somente leitura;
- readiness em dois blocos;
- ações agrupadas no rodapé.

A Focus Queue continua simples: ações assistíveis mostram apenas `Preparar contato`, e os detalhes ficam no painel.

## Futuro

A camada pode receber IA posteriormente para:

- ajustar tom;
- resumir contexto;
- sugerir variações;

desde que a IA trabalhe sobre o mesmo conjunto explícito de fatos e não altere os gates de consentimento/canal.
