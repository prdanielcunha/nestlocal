# Autopilot Guided Experiments

## Objetivo

Permitir que o NestLocal ajude a operação a testar canais de contato de forma pequena, auditável e opt-in, sem alterar silenciosamente a prioridade da Fila do Autopilot.

O V1 compara:

- WhatsApp;
- telefone.

A métrica observada é o outcome humano registrado no Action Assistant.

## Pré-requisitos para iniciar

Um experimento só pode ser iniciado quando a base dos últimos 30 dias possui:

- pelo menos 10 contatos com cobertura detalhada;
- pelo menos 5 contatos detalhados por WhatsApp;
- pelo menos 5 contatos detalhados por telefone;
- pelo menos 5 contatos detalhados no tipo de ação escolhido.

Tipos de ação suportados no V1:

- `quote_followup`;
- `customer_reactivation`.

Somente owner/admin ou um papel global administrativo pode iniciar ou encerrar o experimento.

## Um experimento ativo por organização

O ponteiro:

`nestlocal_experiment_state/active`

garante que a organização tenha no máximo um experimento guiado ativo.

O histórico fica em:

`nestlocal_experiments/{experimentId}`

## Meta explícita

O usuário escolhe uma meta por variante:

- 5;
- 10;
- 15;
- 20 contatos por canal.

A meta não é alterada automaticamente.

## Elegibilidade do contato

Um contato só entra no experimento quando:

1. a ação corresponde ao tipo de ação do experimento;
2. o cliente possui telefone;
3. WhatsApp está autorizado para aquela finalidade;
4. as duas variantes ainda fazem parte do teste;
5. a variante escolhida ainda não atingiu a meta;
6. o cliente ainda não foi usado naquele experimento.

Se qualquer regra falhar, o contato operacional continua podendo ser registrado normalmente, mas fica fora do experimento.

## Um cliente = uma amostra

Para evitar que o mesmo cliente seja contado em WhatsApp e telefone, o experimento cria uma amostra única:

`nestlocal_experiment_samples/{hash(experimentId|targetType|targetId)}`

A primeira variante registrada para aquele alvo é a amostra experimental.

Um segundo contato com o mesmo alvo pode existir no histórico operacional, mas não aumenta a amostra do experimento.

## Sugestão de variante

O Action Assistant mostra a próxima variante sugerida usando uma regra determinística:

- selecionar a variante com menor quantidade de amostras;
- em empate, manter a ordem definida no experimento.

A sugestão serve somente para balancear a amostra.

Ela não:

- muda a prioridade da fila;
- bloqueia o outro canal;
- envia mensagens;
- escolhe o canal pelo usuário.

Se o usuário registrar outro canal válido, o contato é contado no canal realmente utilizado.

## Outcome e refinamento

Cada amostra carrega o outcome humano:

- `unresolved`;
- `no_response`;
- `asked_later`;
- `positive_signal`;
- `not_interested`.

Quando um outcome é refinado no mesmo evento:

- o total da variante não aumenta;
- o outcome antigo diminui;
- o novo outcome aumenta;
- a amostra continua sendo a mesma.

## Conclusão

O experimento é concluído automaticamente apenas quando as duas variantes atingem a meta escolhida.

Também pode ser encerrado manualmente por owner/admin.

Ao concluir:

- o status vira `completed`;
- o ponteiro ativo é limpo;
- o histórico permanece disponível.

Ao encerrar manualmente:

- o status vira `stopped`;
- o ponteiro ativo é limpo;
- os dados já observados permanecem disponíveis.

## Resultado

A Home mostra por variante:

- contatos observados / meta;
- respostas registradas;
- sinais positivos.

O V1 não declara vencedor.

Não existe:

- “melhor canal”;
- alteração automática de prioridade;
- previsão de fechamento;
- score de vendedor;
- causalidade atribuída;
- receita projetada.

## Relação com Assisted Revenue

Guided Experiments e Assisted Revenue são conceitos separados.

O experimento mede outcomes registrados em uma amostra de contatos.

Assisted Revenue continua usando suas próprias regras auditáveis de atribuição e não deve ser inferida a partir de um experimento.

## Idiomas

PT / EN / ES.
