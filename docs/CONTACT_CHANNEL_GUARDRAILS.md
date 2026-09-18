# Contact Channel Guardrails

## Objetivo

Garantir que o NestLocal não sugira nem registre WhatsApp como canal de follow-up/reativação quando o cliente não autorizou aquela finalidade.

## Consentimento por finalidade

### Follow-up de orçamento

WhatsApp só fica disponível quando o pedido possui:

`messagingConsent.serviceUpdates.accepted = true`

### Reativação / manutenção

WhatsApp só fica disponível quando o cliente possui:

`messaging.consents.maintenanceReminders.accepted = true`

Esses consentimentos não são intercambiáveis.

## Telefone

Uma ligação continua sendo uma ação possível quando existe telefone válido no cadastro.

A UI separa explicitamente:

- abrir WhatsApp;
- registrar WhatsApp realizado;
- ligar;
- registrar ligação realizada.

Abrir um link não registra a ação automaticamente.

## Backend

Mesmo que um cliente malicioso chame a API diretamente, um `action-event` com:

`channel = whatsapp`

é rejeitado com `WHATSAPP_OPT_IN_REQUIRED` quando o consentimento correspondente não existe.

## Idempotência

A chave diária de uma ação inclui:

- tipo de ação;
- alvo;
- canal;
- dia local da organização.

Assim, uma ligação e um WhatsApp no mesmo dia não colidem na mesma chave.

## Fuso horário

A elegibilidade por data de retorno usa `nestlocal_settings/public.timezone`.

A Home e o mecanismo Next Best Action também usam a data da organização, evitando divergência quando o operador acessa o NestLocal de outro fuso.

## Receita Assistida

O canal salvo no `lastAssistance` continua fazendo parte da atribuição.

Portanto a organização consegue distinguir se um retorno assistido foi antecedido por WhatsApp, telefone, e-mail ou outro canal, sem atribuir WhatsApp a uma ligação.
