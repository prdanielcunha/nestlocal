# Autopilot Explainable Insights

## Objetivo

Transformar o Outcome Loop em aprendizado operacional útil sem transformar correlação em causalidade.

O NestLocal pode mostrar diferenças observadas entre canais e tipos de ação, mas só quando existe amostra mínima e sempre com o denominador visível.

## Matriz de fatos

Os buckets diários `nestlocal_action_metrics/{YYYY-MM-DD}` passam a manter, além dos totais existentes:

- `channelOutcomes`;
- `actionTypeOutcomes`;
- `cohortSchemaVersion = 1`.

Cada grupo guarda:

- total de contatos;
- outcomes explícitos registrados pela equipe.

Exemplo conceitual:

```
channelOutcomes.whatsapp = {
  total: 8,
  outcomes: {
    positive_signal: 2,
    asked_later: 2,
    no_response: 3,
    not_interested: 1
  }
}
```

Nenhum dado é inferido.

## Cobertura retrocompatível

Eventos criados antes desta versão podem possuir `metricsRecorded=true` sem possuir a nova cobertura cruzada.

Por isso existe:

`cohortMetricsRecorded`

Regras:

- evento novo registra métricas globais e de coorte uma única vez;
- refinamento posterior altera apenas o outcome correspondente;
- evento antigo já contado globalmente pode entrar na matriz de coorte uma única vez sem aumentar o total histórico;
- a UI mostra explicitamente o tamanho da amostra detalhada.

Isso impede que dados antigos incompletos sejam apresentados como uma comparação completa.

## Limites mínimos

Uma taxa de resposta só é exibida para um grupo com pelo menos:

**5 contatos detalhados**

A leitura passa ao estágio de comparação descritiva de canais quando existem:

- pelo menos **10 contatos detalhados** no total;
- pelo menos **2 canais** com 5 ou mais contatos cada.

Antes disso:

- os totais continuam visíveis;
- grupos pequenos mostram “amostra pequena”;
- nenhum percentual é exibido para o grupo pequeno;
- a interface informa quantos contatos ainda faltam para formar uma base mínima.

## Definição de resposta

`responseRecorded` continua sendo somente a soma dos outcomes humanos:

- `asked_later`;
- `positive_signal`;
- `not_interested`.

Não contam como resposta:

- `no_response`;
- `unresolved`.

Uma resposta não significa venda, conversão ou sucesso.

## O que a UI pode dizer

Exemplo válido:

> WhatsApp — 4 respostas registradas em 6 contatos (67%).

Exemplo inválido:

> WhatsApp é o melhor canal.

O primeiro é um fato descritivo da amostra. O segundo é uma conclusão causal/evaluativa que a amostra não sustenta.

## Guardrails

O recurso não:

- muda a prioridade do Next Best Action;
- altera regras do Autopilot;
- cria score de vendedor;
- projeta receita;
- prevê fechamento;
- afirma causalidade;
- escolhe um “canal vencedor”;
- envia mensagens;
- executa qualquer ação automaticamente.

## Evolução futura

Com mais dados, poderão existir experimentos assistidos e sugestões explicáveis, desde que:

1. o tamanho da amostra continue explícito;
2. o usuário continue no controle;
3. qualquer mudança operacional seja opt-in;
4. Assisted Revenue continue separado de outcome e de correlação por canal;
5. nenhuma recomendação silenciosa reescreva as regras determinísticas do Autopilot.

## Idiomas

PT / EN / ES.
