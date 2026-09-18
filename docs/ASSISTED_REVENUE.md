# Assisted Revenue

## Objetivo

Medir valor econômico ligado a ações registradas no NestLocal sem fazer afirmações causais que os dados não sustentam.

O nome da métrica é **Receita Assistida**, não “receita causada pela IA”.

## Ações elegíveis

Apenas ações concluídas explicitamente por uma pessoa entram no modelo inicial:

- `quote_followup`;
- `customer_reactivation`.

Canais registrados:

- WhatsApp;
- telefone;
- e-mail;
- outro.

Abrir um link do WhatsApp não cria atribuição. O usuário precisa confirmar **Registrar contato feito**.

## Follow-up de orçamento

Só pode ser registrado quando:

- o pedido está em `quoted`;
- está parado há pelo menos 48 horas.

Se o cliente aceitar o orçamento em até 30 dias depois da ação, o pedido recebe `assistedConversion`.

O aceite pode acontecer pela página pública ou pelo painel interno.

## Reativação

Só pode ser registrada quando `nextServiceDate` chegou.

Se o mesmo cliente, identificado pelo telefone normalizado, criar um novo pedido em até 90 dias depois da ação, o novo pedido recebe `assistedAcquisition`.

## Quando vira receita

A métrica só soma valor quando o serviço é concluído pela primeira vez.

A conclusão já possui a trava `completionRecordedAt`, portanto uma mudança posterior de status não duplica o valor.

Se o pedido possui `assistedConversion` ou `assistedAcquisition`, a primeira conclusão cria:

- um evento em `nestlocal_revenue_events/{requestId}`;
- incremento em `nestlocal_metrics/revenue.assistedRevenueCents`;
- incremento em `assistedJobs`;
- marcação de atribuição no próprio pedido.

O valor considerado é o valor final conhecido; quando não existe, usa o valor confiável do orçamento.

## Interpretação correta

“R$ 4.200 de Receita Assistida” significa:

> serviços concluídos depois de uma ação registrada no NestLocal dentro das regras de atribuição.

Não significa que o NestLocal provou ser a única causa daquela receita.

Quando a integração oficial de WhatsApp estiver ativa, eventos de entrega, leitura e resposta poderão aumentar a confiança da atribuição sem mudar esse princípio.
