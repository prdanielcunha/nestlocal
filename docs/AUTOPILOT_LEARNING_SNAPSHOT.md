# Autopilot Learning Snapshot

## Objetivo

Transformar os resultados explícitos do Outcome Loop em aprendizado operacional visível sem criar previsões, scores ocultos ou afirmações de causalidade.

A Home mostra uma janela móvel de 30 dias.

## O que mede

Somente fatos registrados pela equipe:

- contatos registrados;
- respostas registradas;
- sinais positivos;
- contatos sem resposta;
- distribuição por canal;
- distribuição entre follow-up de orçamento e reativação.

“Resposta registrada” é apenas a soma dos outcomes explícitos:

- `asked_later`;
- `positive_signal`;
- `not_interested`.

`no_response` e `unresolved` não contam como resposta.

## Persistência eficiente

O NestLocal não relê centenas de eventos a cada abertura da Home.

Cada contato mantém o evento auditável em `nestlocal_action_events`, mas também atualiza atomicamente um bucket diário:

`nestlocal_action_metrics/{YYYY-MM-DD}`

O bucket guarda apenas contagens agregadas por:

- outcome;
- canal;
- tipo de ação.

A Home consulta no máximo 31 buckets diários para montar a janela de 30 dias.

## Refinamento no mesmo dia

A identidade do contato continua idempotente por ação + alvo + canal + dia.

Se o usuário primeiro registrar “sem resposta” e depois atualizar o mesmo contato para “sinal positivo”:

- o total de contatos não aumenta;
- o bucket `no_response` diminui;
- o bucket `positive_signal` aumenta;
- canal e tipo de ação não são duplicados.

Eventos antigos que ainda não possuam `metricsRecorded` entram no bucket uma única vez quando forem refinados.

## Guardrail

O Learning Snapshot não calcula:

- probabilidade de fechamento;
- “melhor canal”;
- causalidade;
- receita projetada;
- score de vendedor;
- prioridade automática baseada em amostra pequena.

Ele também não altera sozinho o Next Best Action.

A próxima evolução pode usar esses dados para sugestões explicáveis somente quando houver volume suficiente e sempre preservando as regras determinísticas do Autopilot como fonte de verdade.

## UX

A Home apresenta:

1. contatos registrados;
2. respostas registradas;
3. sinais positivos;
4. sem resposta;
5. chips de distribuição por canal;
6. chips de distribuição por ação;
7. texto explícito explicando que são dados observados.

Sem dados, o card exibe um estado vazio útil em vez de zeros tratados como desempenho.

## Idiomas

PT / EN / ES.
