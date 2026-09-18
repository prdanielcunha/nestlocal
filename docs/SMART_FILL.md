# Smart Fill — Real Capacity Matching

## Objetivo

O Smart Fill identifica capacidade operacional realmente livre e cruza essa capacidade com clientes cuja data registrada de retorno já chegou.

Ele responde:

> existem janelas de atendimento livres nos próximos 7 dias e clientes elegíveis para reativação?

Ele **não estima receita**, demanda futura ou probabilidade de fechamento.

## Fonte de verdade da capacidade

O Smart Fill só é ativado quando a organização configura explicitamente:

- fuso horário;
- dias da semana em que atende;
- períodos de atendimento: manhã, tarde e/ou noite.

Nenhum horário comercial é presumido silenciosamente.

A configuração é salva por uma rota própria:

`PUT /api/organizations/:orgId/nestlocal/capacity`

Alterar capacidade não despublica o catálogo nem a página pública.

## Capacidade por equipe

A capacidade é calculada usando somente membros com acesso ativo ao NestLocal.

Na V1:

**1 profissional × 1 dia × 1 período = 1 slot de capacidade.**

Pedidos em `scheduled` ou `in_progress` ocupam o slot quando possuem:

- mesma data;
- mesmo período;
- mesmo responsável.

A trava atômica de agenda continua sendo a autoridade para impedir dupla reserva. O Smart Fill apenas projeta a capacidade visível a partir desses fatos.

## Horizonte

A projeção atual considera os próximos 7 dias.

No dia atual, períodos que já passaram são removidos aproximadamente:

- manhã depois das 12h;
- tarde depois das 17h;
- noite depois das 22h.

O cálculo respeita o fuso configurado da organização.

## Clientes elegíveis

Um cliente entra na fila quando:

`nextServiceDate <= hoje`

O sistema não inventa uma data de retorno. Ela precisa ter sido registrada na conclusão ou na operação do cliente.

## Combinações possíveis

A métrica “Combinações possíveis” é:

`min(janelas livres, clientes prontos para retorno)`

Ela significa somente que existem pares operacionais possíveis.

Não significa:

- receita garantida;
- cliente interessado;
- conversão provável;
- slot automaticamente reservado.

## Ação

O Smart Fill leva a equipe para a fila de reativação.

Contato continua manual na fase atual e pode ser registrado para Receita Assistida.

Quando o Connect/WhatsApp oficial for ativado com consentimento e política de custo apropriados, o Smart Fill poderá preparar mensagens elegíveis sem alterar essas regras de capacidade.
