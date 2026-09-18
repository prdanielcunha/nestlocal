# Service Return Rules

## Objetivo

Permitir que cada serviço defina uma recorrência operacional explícita.

Exemplos:

- manutenção preventiva: 90 dias;
- higienização: 180 dias;
- serviço sem recorrência: 0.

A regra não é inferida pela IA. Ela precisa estar configurada no catálogo do serviço.

## Configuração

Cada serviço possui `returnAfterDays`:

- inteiro;
- mínimo 0;
- máximo 730;
- `0` desativa retorno automático.

A configuração está disponível tanto para serviços de preço fixo quanto para serviços em modo de revisão/orçamento manual.

## Prioridade da data de retorno

Ao concluir um serviço, o NestLocal resolve a próxima data nesta ordem:

1. data manual enviada na conclusão;
2. data de retorno já existente no pedido;
3. regra `returnAfterDays` do serviço;
4. nenhuma data.

A regra nunca sobrescreve uma decisão humana já registrada.

## Fuso horário

Quando a regra do serviço é usada, a data-base é o dia local da organização, conforme `nestlocal_settings/public.timezone`.

O cálculo soma dias de calendário à data local. Isso evita deslocamentos por UTC ou horário de verão em organizações internacionais.

## Proveniência

Quando a data é criada pela regra do serviço, o pedido registra:

- `return.source = service_rule`;
- `return.ruleDays`;
- `return.nextServiceDate`.

O cliente registra:

- `nextServiceDate`;
- `nextServiceReason`;
- `nextServiceSource = service_rule`.

Datas manuais ou previamente existentes não são rotuladas como geradas pela regra.

## Relação com Smart Fill

Uma data automática alimenta a mesma fonte de verdade usada pela fila de reativação e pelo Smart Fill.

Fluxo:

serviço concluído
→ regra explícita de recorrência
→ próxima data registrada
→ cliente entra na fila quando a data chega
→ Smart Fill cruza cliente elegível com capacidade livre
→ contato pode ser registrado
→ eventual novo serviço pode compor Receita Assistida.

## Limites

A V1 não tenta:

- prever a melhor recorrência por IA;
- alterar a regra automaticamente;
- antecipar que o cliente aceitará retornar;
- gerar receita projetada.

Esses comportamentos exigiriam evidência adicional e ficam fora da regra determinística atual.
