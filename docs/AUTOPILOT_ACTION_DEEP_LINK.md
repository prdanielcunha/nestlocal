# Autopilot Action Deep Link

## Objetivo

Reduzir o caminho entre uma recomendação do Autopilot e o pedido operacional correto.

Antes:

`Fila do Autopilot → Pedidos → procurar cliente → abrir pedido`

Depois:

`Fila do Autopilot → pedido exato já expandido`

## Comportamento

Ações operacionais com `requestId` usam:

`data-open-request="{requestId}"`

Ao clicar:

1. a página muda para `requests`;
2. `S.focusRequestId` recebe o pedido alvo;
3. a lista é renderizada;
4. o `<details>` correspondente é aberto;
5. o navegador rola suavemente até o pedido;
6. o card recebe destaque temporário por 1,8s.

## Escopo

Aplica-se às ações que dependem do pedido:

- revisar;
- agendar;
- executar;
- concluir;
- cobrar.

Follow-up e reativação continuam priorizando os controles de contato existentes.

## Estado

O foco é transitório.

Ao:

- navegar pelo menu;
- trocar organização;

o `focusRequestId` é limpo para evitar abrir um pedido antigo em outro contexto.

## Segurança

O deep-link não altera:

- status;
- agenda;
- pagamento;
- responsável;
- consentimento;
- mensagens.

Ele apenas navega para a fonte de verdade já carregada e mantém todas as confirmações existentes.

## UX

Cada card de pedido recebe `scroll-margin-top` para não ficar escondido sob o header.

O pedido focado recebe borda/sombra discreta e temporária, sem animação agressiva.

Nenhuma nova API ou custo externo é introduzido.
