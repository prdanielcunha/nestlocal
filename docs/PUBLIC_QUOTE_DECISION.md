# Public Quote Decision

## Fluxo

Quando existe um valor confiável para o pedido, o cliente pode decidir diretamente na página pública:

- aprovar orçamento;
- recusar por agora.

A decisão usa o mesmo token secreto de acompanhamento do pedido.

## Quando a aprovação aparece

### Serviço com preço determinístico

Se a engine retornar `priced`, a aprovação aparece imediatamente após o envio do pedido.

### Serviço sob avaliação

O prestador pode:

1. avaliar o pedido;
2. preencher o valor final na operação;
3. marcar o pedido como `quoted`.

A página de acompanhamento passa a usar `commercial.finalAmountCents` como valor exibido e habilita a decisão.

## Estados

Novos estados do pedido:

- `accepted`
- `declined`

Um pedido aprovado pode então ser agendado.

Pedidos recusados deixam de contar como demanda operacional aberta.

## Segurança

- o endpoint exige `requestId + tracking token`;
- o hash do token permanece armazenado no pedido;
- a mesma decisão repetida é idempotente;
- trocar a decisão depois que ela foi registrada não é permitido pela rota pública;
- pedidos já agendados, em execução, concluídos ou cancelados não aceitam nova decisão pública;
- aprovação exige valor positivo conhecido.

A empresa continua podendo corrigir estados administrativos pelo painel quando necessário.
