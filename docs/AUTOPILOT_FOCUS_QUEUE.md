# Autopilot Focus Queue

## Objetivo

Transformar o motor de Next Best Action em uma experiência diária simples para empresas pequenas.

Em vez de mostrar uma lista de scores numéricos, a Home apresenta:

1. uma única ação em foco;
2. o motivo factual que fez aquela ação subir;
3. os controles necessários;
4. até cinco próximas ações;
5. quantas ainda permanecem na fila.

## Ordem

A ordem continua sendo definida por `nextBestActions()`.

A Focus Queue não cria um segundo algoritmo de prioridade.

Ela apenas traduz os scores internos para três faixas humanas:

- `now`: prioridade >= 90;
- `next`: prioridade >= 75;
- `opportunity`: demais ações elegíveis.

Os números internos deixam de ser exibidos na interface.

## Por que agora?

Cada tipo de ação recebe uma explicação determinística:

- `finish`: serviço já iniciado;
- `schedule`: cliente aceitou e falta agenda;
- `execute`: atendimento é hoje ou está vencido;
- `review`: pedido aguarda revisão;
- `followup`: orçamento está há pelo menos 48 horas sem avanço;
- `collect`: serviço concluído ainda possui saldo pendente;
- `reactivate`: cliente chegou ou passou da data de retorno.

Quando existe data vencida, os dias são calculados por datas ISO de calendário.

Quando existe follow-up, o mecanismo preserva `ageHours` a partir do timestamp real do pedido.

## Ações

A fila reaproveita os mesmos guardrails de canal já existentes:

- WhatsApp somente quando o consentimento compatível existe;
- ligação continua separada;
- abrir WhatsApp não registra contato;
- registrar contato continua sendo uma ação explícita;
- outros estados levam para Pedidos.

## Mobile

No desktop, o foco usa conteúdo + ações lado a lado.

Em telas menores:

- o foco passa para uma coluna;
- controles ficam abaixo;
- botões usam grade de duas colunas quando há espaço;
- estado de consentimento ocupa a largura completa;
- itens seguintes ficam compactos.

## Limites

A fila não:

- altera automaticamente um pedido;
- envia mensagem;
- marca uma ação como concluída sem evento real;
- usa IA para inventar prioridade;
- estima chance de fechamento.

É uma camada de decisão e explicabilidade sobre fatos já registrados no NestLocal.
