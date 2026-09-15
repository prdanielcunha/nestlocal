# NestLocal

Canal próprio de contratação para pequenos prestadores de climatização.

## Estado

Piloto comercial com frontend PWA, API Cloud Run, Firebase Authentication,
Firestore multi-tenant, catálogo publicável, cotação determinística, pedidos,
fotos e acompanhamento. A produção é implantada automaticamente pela branch
`production` no Hosting isolado do NestLocal.

O escopo inicial é higienização residencial, visita técnica e encaminhamento de exceções. Preços e condições vêm de regras aprovadas pelo prestador. A IA poderá auxiliar extração e resumo, mas não definir preços ou confirmar disponibilidade.

## Entregas do piloto

- Núcleo determinístico de elegibilidade e cotação.
- Testes de preço, campos inválidos e encaminhamento para avaliação.
- Login compartilhado com o MillionsNest e autorização por organização.
- Página pública por prestador, pedido com consentimento e até cinco fotos.
- Caixa de entrada, status, indicadores e página de acompanhamento do cliente.
- Build e deploy sem chaves persistentes, via GitHub OIDC.

## Operação

Os valores criados no primeiro acesso são exemplos em rascunho. Revise catálogo,
preços, cidades e WhatsApp antes de publicar. A cobrança dos primeiros pilotos é
manual e a ativação é controlada; a assinatura self-service continuará pertencendo
ao Hub MillionsNest quando a validação comercial justificar a integração.

Veja [docs/COMMERCIAL_PILOT.md](docs/COMMERCIAL_PILOT.md).
