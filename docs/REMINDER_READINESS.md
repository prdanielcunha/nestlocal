# Reminder Readiness & Batch Preparation

## Objetivo

Transformar clientes com retorno vencido em uma fila operacional segura para o futuro Autopilot de mensagens.

A funcionalidade responde:

- quantos clientes estão com retorno vencido;
- quantos possuem consentimento para lembrete;
- quantos estão realmente prontos para preparação;
- o que está bloqueando os demais.

Nenhuma mensagem é enviada nesta fase.

## Fonte de verdade

A fila consulta diretamente clientes cujo:

`nextServiceDate <= hoje da organização`

A data é calculada usando `nestlocal_settings/public.timezone`.

A consulta é limitada a 200 registros por lote. Quando o limite é atingido, a resposta marca `dueCountTruncated=true` e a UI exibe `200+`, em vez de fingir que o lote é o total completo.

## Readiness

Para cada cliente vencido, a função canônica `messagingEligibility` valida:

1. consentimento `maintenanceReminders`;
2. template aprovado de manutenção/retorno;
3. conexão oficial do provedor.

Os bloqueios são agrupados por razão:

- `WHATSAPP_OPT_IN_REQUIRED`;
- `MESSAGE_TEMPLATE_REQUIRED`;
- `MESSAGING_PROVIDER_NOT_CONNECTED`.

## Preparação em lote

`POST /api/organizations/:orgId/nestlocal/messages/prepare-due-reminders`

A rota:

1. revalida tenant/autorização;
2. resolve o fuso da organização;
3. consulta diretamente os clientes vencidos;
4. recalcula readiness;
5. seleciona somente os elegíveis;
6. gera uma chave determinística por cliente + template + dia;
7. não duplica itens já existentes;
8. cria somente registros `ready`.

Clientes bloqueados aparecem no resumo, mas não geram documentos bloqueados em massa.

## Outbox e Connect

Cada item preparado contém:

- `sourceApp = nestlocal`;
- `deliveryContractVersion = 1`;
- categoria;
- target type/id;
- provider;
- template aprovado;
- `consentEvidenceRef`;
- modo `approved_template_required`;
- autor da preparação.

O telefone não é duplicado no outbox. O alvo continua referenciado pelo customerId e deverá ser resolvido/revalidado no momento do dispatch server-side.

A evidência segue o formato:

`nestlocal-consent:{customerId}:maintenance_reminders`

Isso prepara o envelope para a boundary outbound já definida no MillionsNest Connect.

## Idempotência

A preparação usa o dia local da organização, não UTC:

`maintenance_reminder | customerId | templateName | localDate`

Retries no mesmo dia não criam mensagens duplicadas.

## Estado atual

Mesmo com a fila pronta, o envio real continua dependendo de:

- conexão oficial do canal;
- política de custo liberada no Connect;
- worker/endpoint server-to-server de dispatch;
- persistência do provider message ID;
- webhooks validados de entrega/falha.

Até esses gates existirem, o NestLocal apenas avalia e prepara.
