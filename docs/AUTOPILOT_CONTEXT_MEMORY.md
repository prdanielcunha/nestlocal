# Autopilot Operational Context Memory

## Objetivo

Transformar um Experiment Review já aceito como `context_only` em memória operacional útil no momento em que uma pessoa prepara um contato.

A memória não muda o Autopilot. Ela apenas traz evidência revisada para perto da decisão humana.

## Fonte canônica

A memória usa exclusivamente:

`experiment.review.snapshot`

Ela não recalcula a leitura a partir do progresso atual do experimento.

Isso preserva exatamente a evidência que foi revisada quando a decisão `context_only` foi registrada.

## Elegibilidade

Um experimento pode virar contexto quando:

- não está ativo;
- pertence ao mesmo tipo de ação do Action Assistant;
- possui `review.decision = context_only`;
- possui `reviewStale !== true`;
- possui snapshot versão 1;
- possui pelo menos uma amostra registrada.

## Ação específica

Tipos suportados:

- `quote_followup`;
- `customer_reactivation`.

Um review de follow-up não aparece em reativação e vice-versa.

## Proteção contra contaminação

Se existir um experimento ativo do mesmo tipo de ação:

**a memória histórica é ocultada no Action Assistant.**

Motivo:

mostrar o resultado anterior durante um novo teste poderia influenciar a escolha do canal e contaminar a amostra.

Quando o experimento ativo termina, o contexto revisado anterior volta a ficar elegível, salvo se estiver stale.

## Review stale

Quando um outcome experimental é refinado depois da revisão:

`reviewStale = true`

Enquanto estiver stale, o contexto não aparece no Action Assistant.

É necessário revisar novamente o experimento para produzir um novo snapshot válido.

## O que aparece

Quando a amostra revisada é comparável:

- taxa de resposta por canal;
- numerador / denominador;
- diferença absoluta observada em pontos percentuais;
- nota humana do review, quando houver.

Quando a amostra não é comparável:

- quantidade de contatos por canal;
- aviso de amostra pequena;
- aviso de experimento incompleto quando aplicável.

## O que não aparece

A memória não mostra:

- vencedor;
- “melhor canal”;
- recomendação de canal;
- probabilidade de fechamento;
- score de vendedor;
- causalidade;
- receita projetada.

## Efeito operacional

Nenhum.

A memória não:

- muda prioridade;
- altera Next Best Action;
- muda a fila;
- muda o canal registrado;
- bloqueia contato;
- envia mensagem;
- cria evento;
- altera pedido;
- altera cliente.

## UI

A memória aparece dentro do Action Assistant como um bloco compacto de “Memória operacional”.

Ela fica separada:

- dos fatos atuais daquele cliente;
- do experimento ativo;
- do formulário de outcome;
- das ações de contato.

## Idiomas

PT / EN / ES.
