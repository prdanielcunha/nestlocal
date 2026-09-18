# Service Playbooks

## Princípio

O NestLocal continua sendo **um único produto horizontal** para operações locais de serviço.

Os playbooks não criam versões separadas do app. Eles apenas aceleram o primeiro acesso com um catálogo inicial coerente com o tipo de operação.

## Playbooks iniciais

### Climatização

Mantém o comportamento já existente:

- higienização de split;
- visita técnica;
- instalação ou reparo.

Os serviços de preço fixo continuam usando qualificadores de tipo de equipamento e acesso seguro.

### Limpeza especializada

Catálogo inicial:

- higienização de estofados;
- impermeabilização;
- limpeza especializada.

Todos começam em modo `review`: nenhum preço é inventado.

### Controle de pragas

Catálogo inicial:

- controle de pragas;
- limpeza de caixa d’água;
- vistoria técnica.

Todos começam em modo `review`.

### Geral

Para outros prestadores:

- solicitação de orçamento;
- visita técnica.

Ambos começam em modo `review`.

## Regras de segurança

1. Um playbook só cria rascunhos. O prestador precisa revisar antes de publicar.
2. Serviços fora de climatização começam sem preço automático até que uma regra confiável seja configurada.
3. A engine de cotação continua determinística e server-side.
4. `requiresEquipmentType:false` permite um serviço fixo sem pergunta de equipamento.
5. `requiresSafeAccess:false` permite um serviço fixo sem pergunta de acesso.
6. A ausência dessas flags preserva o comportamento anterior: ambos os qualificadores são exigidos.
7. O formulário público mostra apenas perguntas relevantes para o serviço selecionado.
8. Nomes iniciais dos serviços possuem PT/EN/ES.

## Evolução

Novos verticais devem entrar como playbooks, não como novos aplicativos, desde que o fluxo fundamental continue sendo:

**cliente → orçamento → aprovação → agenda → execução → pagamento/status → retorno**.

Um novo app só deve ser considerado se o domínio operacional deixar de compartilhar esse fluxo e exigir modelo de dados ou regras substancialmente diferentes.
