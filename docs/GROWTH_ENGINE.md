# NestLocal Growth Engine

## Objetivo

Transformar aquisição comercial em um fluxo mensurável e repetível sem transformar o NestLocal em uma agência.

O Growth Engine possui dois componentes:

1. **Raio-X de Receita Perdida** — ferramenta pública de diagnóstico e geração de leads.
2. **Radar comercial** — área interna, disponível apenas para papéis administrativos globais do ecossistema.

## Raio-X público

Rota: `/raio-x` (alias: `/diagnostico`).

O formulário coleta somente dados fornecidos voluntariamente pela empresa:

- empresa, responsável, cidade, segmento e WhatsApp;
- quantidade aproximada de orçamentos por mês;
- ticket médio;
- percentual aproximado que recebe follow-up;
- participação do WhatsApp na entrada de pedidos;
- tamanho da equipe;
- necessidade de agenda;
- recorrência do serviço;
- sinal de operação manual.

O resultado **não é uma previsão de receita**.

A oportunidade indicativa é calculada de forma determinística:

```
orçamentos sem acompanhamento
× 15% de hipótese de recuperação
× ticket médio informado
```

A hipótese de 15% fica explícita no resultado. Nenhum modelo de IA inventa receita, conversão, ticket ou demanda.

O envio exige consentimento. O lead fica em `nestlocal_growth_leads` com origem `revenue_xray`.

## Fit Score

Para leads manuais, o Radar usa a mesma lógica validada na prospecção inicial:

| Sinal | Peso |
| --- | ---: |
| Orçamento faz parte da venda | 20 |
| WhatsApp é canal forte | 20 |
| Precisa agendar serviço/equipe | 15 |
| Há recorrência | 15 |
| Sinais de demanda | 10 |
| Equipe pequena | 10 |
| Dono envolvido | 5 |
| Sem sistema forte aparente | 5 |

Cada sinal aceita 0, 0,5 ou 1.

O score é um filtro operacional, não uma garantia de compra.

## Pain Score

Após a primeira conversa, a dor real é qualificada com:

| Sinal | Peso |
| --- | ---: |
| Orçamentos se perdem | 25 |
| Sem follow-up formal | 20 |
| Sem reativação automática | 15 |
| Agenda desorganizada | 15 |
| Volume suficiente | 10 |
| Dono sente a dor | 5 |
| Urgência em resolver | 10 |

Referência de uso:

- 70–100: quente;
- 45–69: morno;
- abaixo de 45: baixa prioridade.

O sistema não toma a decisão comercial sozinho. O score serve para ordenar atenção.

## Segurança e privacidade

- APIs do Radar exigem autenticação Firebase e papel administrativo global.
- Leads do Raio-X não são expostos por endpoints públicos.
- O Raio-X tem rate limit independente.
- Nenhuma mensagem de WhatsApp é enviada automaticamente.
- O contato deve respeitar consentimento e as políticas do canal.
- Dados operacionais informados no Raio-X são tratados como declarações do próprio lead, não fatos verificados.

## Próximos passos seguros

1. Medir conclusão do Raio-X.
2. Medir taxa de resposta dos leads do Radar.
3. Medir diagnóstico → demo → trial → cliente.
4. Ajustar pesos somente com dados reais.
5. Integrar uma fonte oficial de prospecção/enriquecimento apenas depois que o processo manual estiver validado.
6. Habilitar mensagens apenas com canal oficial, opt-in e governança.
