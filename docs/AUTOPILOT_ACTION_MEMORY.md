# Autopilot Action Memory

## Objetivo

Evitar que uma ação de contato já executada continue aparecendo imediatamente no topo da Fila do Autopilot.

A memória é persistida no backend e não depende do navegador.

## Escopo inicial

A memória se aplica a:

- `quote_followup`;
- `customer_reactivation`.

## Registro

Ao registrar uma ligação ou WhatsApp, o endpoint:

`POST /api/organizations/:orgId/nestlocal/action-events`

aceita:

`snoozeDays`

Regras:

- inteiro;
- mínimo 1;
- máximo 30;
- padrão 1 quando não informado.

O dia atual é calculado no fuso da organização.

A próxima elegibilidade é:

`addIsoDays(today, snoozeDays)`

## Persistência

O alvo recebe:

`assistanceCooldowns[actionType] = nextEligibleDate`

Exemplo:

```
assistanceCooldowns: {
  quote_followup: "2026-09-21"
}
```

O evento armazena também:

- `snoozeDays`;
- `nextEligibleDate`;
- canal;
- autor;
- timestamp do contato.

## Separação de timestamps

Registrar assistência não altera o `updatedAt` operacional do pedido/cliente.

Motivo:

- `updatedAt` deve representar mudança do registro operacional;
- contato assistido já possui `lastAssistance.at`;
- a elegibilidade futura possui `assistanceCooldowns`.

Isso evita misturar “pedido mudou” com “alguém entrou em contato”.

## Idempotência

A chave do evento continua sendo:

`actionType | target | channel | localDate`

Se o mesmo evento já existir no mesmo dia:

- o evento não é duplicado;
- o cooldown pode ser atualizado;
- a resposta continua `idempotent=true`.

## Motor da fila

`actionCooldownAllows(entity, actionType, today)`

comportamento:

- sem data → elegível;
- data inválida → elegível, para nunca esconder trabalho indefinidamente;
- `nextEligibleDate > today` → oculto da fila;
- `nextEligibleDate <= today` → elegível novamente.

O cálculo usa a data da organização já resolvida por `organizationDateIso()`.

## UX

No Action Assistant o usuário escolhe quando a ação deve voltar:

- amanhã;
- em 2 dias;
- em 7 dias.

Padrões:

- follow-up de orçamento: 2 dias;
- reativação: amanhã.

O padrão é apenas uma seleção inicial; o usuário continua no controle.

## Ações fora do Action Assistant

Quando um evento é registrado por uma interface que não mostra o seletor, o backend usa o padrão de 1 dia.

Isso garante pelo menos que uma ação já concluída não reapareça imediatamente no mesmo dia.

## Não faz

A memória não:

- altera status do pedido;
- envia mensagem;
- cria follow-up sem contato registrado;
- marca resposta do cliente;
- estima intenção;
- remove permanentemente uma ação.

Ela apenas controla quando uma ação assistida volta a ser elegível para a fila.
