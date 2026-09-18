# Autopilot Opportunity Pulse

## Objetivo

Transformar a Home do NestLocal em uma tela de decisão operacional, sem virar um dashboard cheio de números sem ação.

O Pulso responde:

- quais orçamentos já deveriam ter recebido acompanhamento;
- quanto existe em propostas conhecidas nesses orçamentos;
- quanto existe de saldo real a receber por serviços concluídos;
- quantos clientes chegaram à data de retorno;
- quantos desses clientes estão prontos para preparação de lembrete;
- quanta capacidade real existe nos próximos sete dias;
- quantas combinações entre capacidade e retorno são possíveis;
- qual é a próxima melhor ação já calculada pelo mecanismo operacional existente.

## Regra de verdade

O Pulso não calcula:

- probabilidade de fechamento;
- receita futura;
- valor esperado de reativação;
- faturamento projetado;
- ticket presumido;
- conversão presumida.

### Orçamentos para acompanhar

Entram somente pedidos com status `quoted` cujo timestamp de atualização/criação atingiu 48 horas.

O valor exibido é a soma do valor comercial/quote já armazenado.

Portanto:

`R$ X em propostas conhecidas`

não significa:

`R$ X de receita perdida`.

### A receber

Usa somente serviços `completed` com payment status `pending` ou `partial`.

Saldo:

`finalAmountCents/quote.totalCents - amountPaidCents`

com piso zero.

### Retornos vencidos

A lista local continua útil para navegação, mas o contador do Pulso prioriza `reminderReadiness.dueCount`, obtido pela consulta canônica por `nextServiceDate`.

Quando o backend sinaliza lote truncado, a UI mostra `200+`.

### Capacidade

Reutiliza `smartFillSnapshot`.

O Pulso não cria horários; apenas exibe slots livres já calculados pela combinação de:

- fuso;
- dias/períodos configurados;
- membros habilitados;
- reservas reais.

### Próxima melhor ação

Reutiliza `nextBestActions()`.

Não existe um segundo algoritmo concorrente de prioridade.

## UX

A Home mantém no topo apenas quatro indicadores gerais:

- ações;
- pipeline aberto;
- receita assistida;
- conversão.

Clientes e reativações deixam de ocupar cards genéricos porque o Pulso apresenta essas informações no contexto em que exigem decisão.

O Pulso usa quatro sinais clicáveis:

1. orçamentos para acompanhar;
2. saldo a receber;
3. retornos vencidos;
4. capacidade livre em sete dias.

Desktop usa quatro colunas, tablet duas e mobile uma.

## Arquitetura

A lógica pura fica em:

`web/opportunity-pulse.js`

Isso permite testes unitários sem Firebase, DOM ou servidor.

`web/live.js` fica responsável apenas por:

- fornecer dados já carregados;
- translations;
- navegação;
- renderização da página.

Nenhuma nova API, IA ou custo externo é introduzido nesta fase.
