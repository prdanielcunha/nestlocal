# Next Best Action Engine

## Objetivo

Fazer a home **Hoje** responder a uma pergunta simples:

> O que eu deveria fazer agora?

O motor é determinístico. Ele usa apenas fatos já registrados no NestLocal e não depende de IA generativa.

## Prioridades atuais

| Prioridade | Ação | Regra |
| ---: | --- | --- |
| 100 | Finalizar serviço | pedido em `in_progress` |
| 96 | Agendar orçamento aprovado | pedido em `accepted` |
| 92 | Atender serviço | pedido `scheduled` com data vencida ou de hoje |
| 82 | Revisar pedido | pedido `new` ou `reviewing` |
| 76 | Follow-up de orçamento | pedido `quoted` parado por 48h |
| 72 | Acompanhar pagamento | pedido concluído com pagamento pendente/parcial |
| 66 | Reativar cliente | `nextServiceDate` chegou |

As ações são ordenadas por prioridade e nome do cliente.

## Por que não usar IA para essa decisão

Os fatos fundamentais já são estruturados:

- status do pedido;
- decisão do cliente;
- agenda;
- execução;
- pagamento;
- próxima data de serviço.

Usar um modelo generativo para decidir regras básicas adicionaria custo, latência e risco de alucinação.

A IA poderá ser adicionada acima deste motor para:

- explicar por que uma ação importa;
- resumir contexto;
- gerar uma mensagem adequada;
- combinar várias ações;
- sugerir exceções.

Mas a existência da ação e seus fatos de origem permanecem determinísticos.

## Privacidade e canal

O motor não envia mensagens.

Para reativação, o botão abre o WhatsApp com texto pré-preenchido e exige ação humana.
