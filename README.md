# NestLocal

Sistema operacional de receita e execução para prestadores locais: do primeiro contato ao próximo serviço.

## Estado

Piloto comercial com frontend PWA, API Cloud Run, Firebase Authentication,
Firestore multi-tenant, catálogo publicável, cotação determinística, pedidos,
fotos e acompanhamento. A assinatura SaaS, o trial e a gestão de cobrança ficam
centralizados no Hub MillionsNest. A produção é implantada automaticamente pela
branch `production` no Hosting isolado do NestLocal.

O beachhead comercial prioriza serviços locais com orçamento + agenda + execução + recorrência (como climatização, limpeza especializada e controle de pragas). Preços e condições vêm de regras aprovadas pelo prestador. A IA poderá auxiliar extração, resumo e priorização, mas não definir preços, inventar oportunidade ou confirmar disponibilidade.

## Entregas do piloto

- Núcleo determinístico de elegibilidade e cotação.
- Testes de preço, campos inválidos e encaminhamento para avaliação.
- Login compartilhado com o MillionsNest e autorização por organização.
- Página pública por prestador, pedido com consentimento e até cinco fotos.
- Caixa de entrada, status, indicadores e página de acompanhamento do cliente.
- Planos Essencial, Crescimento e Pro, trial único de sete dias, limites mensais
  por organização e bloqueio seguro por inadimplência/cancelamento.
- Checkout Stripe, portal de cobrança e handoff de sessão operados pelo Hub.
- Build e deploy sem chaves persistentes, via GitHub OIDC.

## Growth Engine

A aquisição comercial inclui um **Raio-X de Receita Perdida** público e um **Radar comercial** interno para administradores globais. O Raio-X usa uma fórmula explícita e determinística; o Radar separa Fit Score (aderência) de Pain Score (dor confirmada). Nenhuma mensagem é enviada automaticamente.

Veja [docs/GROWTH_ENGINE.md](docs/GROWTH_ENGINE.md).

## Operação

Os valores criados no primeiro acesso são exemplos em rascunho. Revise catálogo,
preços, cidades e WhatsApp antes de publicar. A mensalidade do software é comprada
e administrada pelo Hub MillionsNest. O pagamento do serviço entre consumidor e
prestador continua externo (PIX, cartão ou outro canal definido pelo prestador).

Veja [docs/COMMERCIAL_PILOT.md](docs/COMMERCIAL_PILOT.md).
