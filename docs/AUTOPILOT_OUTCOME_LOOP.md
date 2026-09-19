# Autopilot Outcome Loop

## Objetivo

Registrar o resultado humano de uma ação assistida sem confundir contato, intenção, status operacional ou receita.

O Outcome Loop complementa a memória da fila. A memória responde **quando a ação volta**; o outcome responde **o que aconteceu no último contato**.

## Outcomes iniciais

O registro aceita apenas:

- `unresolved` — contato feito, ainda sem resultado;
- `no_response` — sem resposta;
- `asked_later` — pediu para retornar depois;
- `positive_signal` — houve sinal positivo;
- `not_interested` — sem interesse.

O usuário também pode registrar uma observação curta de até 180 caracteres.

## Separação de fatos

`lastAssistance` continua sendo o fato auditável de que uma ação foi registrada por uma pessoa.

O resultado fica separado em:

`lastAssistanceOutcome`

Isso é intencional. O outcome:

- não altera status do pedido;
- não aprova orçamento;
- não agenda serviço;
- não marca pagamento;
- não entra sozinho como Receita Assistida;
- não prova intenção ou causalidade.

## Idempotência

A identidade do evento continua:

`actionType | target | channel | localDate`

Se o mesmo contato do dia já existe, o NestLocal não duplica o evento. Ele pode atualizar apenas:

- outcome;
- observação;
- cooldown;
- próxima data de elegibilidade.

## UX

O Action Assistant mostra:

1. mensagem sugerida;
2. fatos usados;
3. readiness do canal;
4. resultado do contato;
5. observação opcional;
6. quando revisar novamente;
7. ações explícitas de copiar, ligar, WhatsApp ou preparar canal oficial.

Quando a mesma ação volta à fila, o último outcome e a observação aparecem como contexto.

## PT/EN/ES

Os controles e rótulos do Outcome Loop existem em português, inglês e espanhol.

## Não faz

O Outcome Loop não envia mensagens, não muda status automaticamente e não aprende pesos de prioridade sozinho. Ele apenas preserva contexto humano estruturado para a próxima decisão.
