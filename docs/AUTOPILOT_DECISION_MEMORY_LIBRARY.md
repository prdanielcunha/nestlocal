# Autopilot Learning Library / Decision Memory

## Objetivo

Preservar aprendizados revisados mesmo quando o experimento que os originou deixa de aparecer no histórico recente carregado pela Home.

Antes desta camada, o Action Assistant dependia dos últimos experimentos carregados. Como a Home limita esse histórico para manter o payload leve, uma decisão humana válida poderia desaparecer da experiência depois de novos testes.

A Decision Memory elimina essa dependência.

## Coleção canônica

`organizations/{orgId}/nestlocal_decision_memory/{actionType}`

No V1 existem no máximo dois documentos canônicos:

- `quote_followup`;
- `customer_reactivation`.

Cada tipo de ação possui uma única memória vigente.

## Quando é criada ou atualizada

Somente quando owner/admin registra no Experiment Review:

`decision = context_only`

O backend grava atomicamente:

1. o review dentro do experimento;
2. a memória canônica daquele tipo de ação.

Campos principais:

- `version`;
- `actionType`;
- `decision`;
- `note`;
- `snapshot`;
- `sourceExperimentId`;
- `reviewedBy`;
- `reviewedAt`;
- `stale`;
- `updatedAt`.

## Snapshot congelado

A memória guarda o mesmo snapshot factual aceito no review.

Ela não recalcula retroativamente:

- taxas;
- spreads;
- tamanho da amostra;
- limitações.

Isso mantém auditabilidade entre o que foi revisado e o que aparece depois como contexto.

## Autoridade canônica

Quando um documento canônico existe para um tipo de ação, ele passa a ser a autoridade.

Regras:

- canônico válido → usado no Action Assistant;
- canônico stale → nenhum contexto histórico é usado;
- canônico inválido → nenhum fallback silencioso;
- canônico ausente → é permitido fallback temporário para um review recente legado.

Isso evita regredir silenciosamente para um aprendizado mais antigo quando o aprendizado vigente precisa ser revisto.

## Migração sem quebra

Organizações com reviews anteriores à Decision Memory ainda podem ver contexto enquanto esse review estiver entre os experimentos recentes.

Esse comportamento é identificado como:

`experiment_fallback`

Na próxima revisão humana do mesmo tipo de ação, o documento canônico é criado automaticamente.

Não existe migração destrutiva.

## Invalidação seletiva

Se um outcome de um experimento revisado mudar:

1. o review do próprio experimento fica stale;
2. o backend lê a memória canônica daquele tipo;
3. a memória só recebe `stale = true` se:

`memory.sourceExperimentId === experiment.id`

Consequência:

um experimento antigo não consegue invalidar uma memória mais nova que já substituiu aquele aprendizado.

Campos de stale:

- `stale = true`;
- `staleReason = source_outcome_changed`;
- `staleAt`.

## Economia de leitura

A memória canônica só é lida durante refinamento de outcome quando:

- o outcome realmente mudou;
- o experimento possui review.

Refinamentos comuns sem impacto no review não geram leitura adicional da Decision Memory.

## Home

O carregamento autorizado traz:

- até 5 experimentos recentes;
- a coleção compacta de Decision Memory.

Os conceitos ficam separados:

- experimentos recentes = execução/histórico;
- Decision Memory = aprendizado humano vigente.

## Learning Library

A Home mostra uma biblioteca compacta dentro da área de aprendizado.

Para cada tipo de ação pode mostrar:

- memória canônica;
- contexto legado temporário;
- memória stale;
- tamanho da amostra revisada;
- diferença observada quando comparável;
- nota humana;
- disponibilidade no Action Assistant.

## Action Assistant

A memória canônica é usada somente quando:

- corresponde ao tipo de ação atual;
- `decision = context_only`;
- `stale !== true`;
- não existe experimento ativo do mesmo tipo.

O contexto continua sendo apenas informativo.

## Proteção contra contaminação

Experimento ativo do mesmo tipo sempre esconde:

- memória canônica;
- fallback legado.

Isso evita que um resultado anterior influencie a escolha do canal durante um novo teste.

## Guardrails

Decision Memory não:

- escolhe canal;
- recomenda variante;
- muda prioridade;
- altera Next Best Action;
- muda fila;
- envia mensagem;
- altera pedido;
- altera cliente;
- prevê fechamento;
- cria score;
- transforma correlação em causalidade;
- altera Assisted Revenue.

## PT / EN / ES

A biblioteca e seus estados possuem copy localizada nos três idiomas.
