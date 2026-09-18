# Schedule Capacity Locks

## Objetivo

Evitar que dois pedidos confirmem o mesmo profissional no mesmo dia e período.

A agenda deixa de ser apenas um campo visual: a confirmação passa por uma transaction do Firestore.

## Identidade do slot

O slot é determinado por:

- data;
- período;
- UID do responsável.

A chave é um hash desses três valores.

## Regras

Para um pedido entrar em `scheduled` ou permanecer `in_progress` com reserva ativa, ele precisa ter:

- data válida;
- período válido;
- membro ativo da organização com acesso ao NestLocal.

O responsável é selecionado entre membros reais da equipe, não por texto livre.

Dentro da mesma transaction o servidor:

1. lê o pedido;
2. calcula o slot desejado;
3. lê o membro responsável;
4. lê o novo slot;
5. lê o slot antigo, se houver;
6. lê o cliente quando necessário para conclusão;
7. só depois executa as escritas.

Se o novo slot já pertence a outro pedido, retorna `SCHEDULE_CONFLICT`.

## Reagendamento

Quando data, período ou responsável mudam:

- o novo slot é reservado;
- o slot antigo é apagado se ainda pertencer ao mesmo pedido.

## Liberação

Ao sair dos estados que precisam manter capacidade reservada, o slot é removido.

`scheduled` e `in_progress` mantêm a reserva. Conclusão, cancelamento, recusa ou retorno para estados anteriores liberam o slot.

## Escopo da V1

A trava atual considera uma capacidade por profissional/período.

Ela não tenta inferir:

- deslocamento;
- duração variável dentro do período;
- múltiplos atendimentos simultâneos do mesmo profissional;
- rotas.

Esses recursos devem ser adicionados somente quando houver dados reais que justifiquem granularidade maior.
