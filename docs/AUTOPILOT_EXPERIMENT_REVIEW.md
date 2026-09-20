# Autopilot Experiment Review

## Objetivo

Fechar o ciclo do Guided Experiment com uma leitura factual e uma decisão humana auditável.

O fluxo passa a ser:

hipótese → experimento → amostra → outcomes → revisão → decisão humana.

O review não reprograma o Autopilot.

## Quando existe review

O review aparece para experimentos com status:

- `completed`;
- `stopped`.

Experimentos ativos não podem ser revisados.

## Métricas mostradas

Para cada variante:

- contatos observados;
- respostas registradas;
- sinais positivos;
- taxa de resposta, quando a variante possui pelo menos 5 contatos;
- taxa de sinais positivos, quando a variante possui pelo menos 5 contatos.

Definição de resposta:

- `asked_later`;
- `positive_signal`;
- `not_interested`.

Não contam como resposta:

- `no_response`;
- `unresolved`.

## Diferenças observadas

Quando as duas variantes possuem pelo menos 5 contatos, a UI mostra:

- diferença absoluta em pontos percentuais na taxa de resposta;
- diferença absoluta em pontos percentuais na taxa de sinais positivos.

Exemplo:

- WhatsApp: 60% de respostas;
- telefone: 40% de respostas;
- diferença observada: 20 pp.

A interface não declara vencedor.

## Experimentos interrompidos

Se um experimento for encerrado antes da meta:

- o histórico permanece;
- a UI sinaliza que a meta não foi atingida;
- variantes com menos de 5 contatos não exibem taxa percentual;
- a leitura continua descritiva.

## Decisão humana: context_only

Owner/admin pode registrar:

`decision = context_only`

Significado:

- a evidência foi revisada;
- pode ser usada como contexto humano;
- nenhuma regra operacional é alterada.

É possível adicionar uma nota opcional de até 180 caracteres.

## Snapshot auditável

Ao registrar a decisão, o backend persiste no próprio experimento:

- versão do review;
- decisão;
- nota;
- snapshot factual das métricas;
- usuário;
- timestamp.

O snapshot contém:

- status;
- tipo de ação;
- meta por variante;
- tamanho total da amostra;
- métricas por variante;
- diferenças observadas;
- limitações.

## Review desatualizado

Outcomes ainda podem ser refinados depois do término do experimento.

Se um outcome de uma amostra experimental for alterado após a revisão:

`reviewStale = true`

A Home deixa de tratar a leitura anterior como atual e pede uma nova revisão.

Uma nova decisão `context_only` grava um novo snapshot e volta:

`reviewStale = false`

## Criar novo experimento

A revisão pode oferecer o atalho “Criar novo experimento” quando os gates atuais permitem novo teste.

O atalho:

- não inicia nada sozinho;
- apenas leva o usuário ao formulário existente;
- mantém a escolha do tipo de ação e da meta sob controle humano.

## Guardrails

Experiment Review não:

- escolhe vencedor;
- recomenda automaticamente canal;
- muda prioridade;
- altera Next Best Action;
- envia mensagem;
- muda status de pedido;
- muda cliente;
- cria score de vendedor;
- prevê fechamento;
- atribui causalidade;
- altera Assisted Revenue.

## Relação com Guided Experiments

Guided Experiments coleta uma amostra controlada.

Experiment Review organiza a leitura humana dessa amostra.

São camadas separadas para impedir que observação vire automação sem consentimento.

## Idiomas

PT / EN / ES.
