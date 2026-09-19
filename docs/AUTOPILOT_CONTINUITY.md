# Autopilot Continuity

## Objetivo

Permitir que o usuário execute uma sequência de ações prioritárias sem perder o contexto da Fila do Autopilot.

Fluxo desejado:

`Hoje → ação em foco → pedido exato → resolver → próxima ação`

## Origem

Quando um pedido é aberto por `data-open-request`, o cliente grava:

- `focusRequestId`: controla qual pedido deve abrir/receber scroll;
- `autopilotRequestId`: registra que o pedido veio da Fila do Autopilot.

Esses estados são transitórios e existem somente no cliente.

## Contexto visível

Quando `autopilotRequestId === request.id`, o pedido mostra uma faixa discreta:

- “Aberto pela Fila do Autopilot”;
- ação “Voltar para Hoje”.

Isso evita que o usuário esqueça por que foi levado àquele pedido.

## Salvar e próxima ação

O formulário de operação mantém o botão padrão `Salvar`.

Quando aberto pelo Autopilot, oferece também:

`Salvar e próxima ação`

O mesmo evento `submit` é reutilizado.

A diferença é lida por:

`event.submitter.dataset.saveNext`

Depois do PATCH e do `loadData()`, o usuário retorna para `today` e a fila é recalculada com os fatos atualizados.

Não existe segunda implementação de persistência.

## Mudanças decisivas

Quando um pedido veio do Autopilot, duas ações já representam naturalmente o fechamento daquele passo:

- mudança de status;
- confirmação de agenda.

Após sucesso e recarregamento dos dados, a interface retorna para Hoje e recalcula a próxima ação.

## Mudanças não decisivas

Salvar operação com o botão comum continua no pedido.

Assim, o usuário pode:

- ajustar valor;
- notas;
- pagamento;
- próxima data;

sem ser removido da tela inesperadamente.

## Limpeza de estado

`focusRequestId` e `autopilotRequestId` são apagados quando:

- o usuário navega pelo menu;
- troca de organização;
- escolhe voltar para Hoje;
- conclui uma ação que retorna para a fila.

Isso evita estado antigo atravessando organizações ou contextos.

## Segurança

A continuidade não altera regras do backend.

Todo status, agenda, pagamento e operação continuam passando pelos mesmos endpoints, transações e validações existentes.

A feature é exclusivamente de fluxo/UX e não introduz IA, provider ou custo externo.
