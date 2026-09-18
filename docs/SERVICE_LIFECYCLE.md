# Service Lifecycle

## Objetivo

Fechar o ciclo operacional do NestLocal sem transformá-lo em ERP.

Fluxo central:

**pedido → orçamento → agenda → execução → conclusão → retorno**

O sistema registra apenas fatos necessários para operar e gerar inteligência futura.

## Status do pedido

- `new`
- `reviewing`
- `quoted`
- `scheduled`
- `in_progress`
- `completed`
- `cancelled`

Mudanças de status são registradas em `statusHistory`.

Ao entrar em `in_progress`, o sistema registra o início da execução quando ainda não existe.

Ao entrar em `completed`, registra a conclusão quando ainda não existe.

## Agenda

Cada pedido pode guardar:

- data agendada;
- período;
- responsável.

A data preferida informada pelo cliente continua separada da data efetivamente agendada.

## Execução

Cada pedido pode guardar:

- observações da execução;
- valor final;
- valor pago;
- status do pagamento.

Status simples de pagamento:

- pendente;
- parcial;
- pago;
- cancelado.

Não há contabilidade, contas a pagar, DRE ou estoque nesta fase.

## Retorno e recorrência

O prestador pode registrar:

- próxima data de serviço;
- motivo do retorno.

Ao concluir um pedido pela primeira vez, o cliente recebe:

- último serviço;
- último pedido;
- data da última conclusão;
- receita acumulada conhecida;
- próxima data de serviço;
- motivo do próximo retorno.

`completionRecordedAt` impede que a mesma conclusão some receita duas vezes caso o status seja corrigido e alterado novamente.

## Hoje

A home passa a identificar clientes cuja `nextServiceDate` já chegou.

Esses clientes aparecem em uma fila de reativação com:

- nome;
- data prevista;
- motivo/último serviço;
- receita acumulada;
- atalho para WhatsApp com mensagem pré-preenchida.

O NestLocal não envia a mensagem automaticamente.

## Princípio de inteligência

A futura IA deve inferir e sugerir ações usando apenas fatos registrados:

- pedidos;
- valores;
- status;
- agenda;
- execução;
- pagamentos;
- histórico do cliente;
- próxima data de serviço.

Nenhum valor de receita futura deve ser inventado.
