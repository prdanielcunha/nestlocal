# Service Playbooks

## Princípio

O NestLocal continua sendo **um único produto horizontal** para operações locais de serviço.

Os playbooks não criam versões separadas do app. Eles aceleram o primeiro acesso com catálogo e perguntas iniciais coerentes com o tipo de operação. Todo catálogo nasce em rascunho e precisa ser revisado antes da publicação.

## Playbooks iniciais

### Climatização

- higienização de split;
- visita técnica;
- instalação ou reparo.

O formulário pode coletar marca/modelo, capacidade em BTUs, tipo de equipamento e problema principal. Serviços fixos continuam usando somente preços e regras aprovadas pelo prestador.

### Limpeza especializada

- higienização de estofados;
- impermeabilização;
- limpeza especializada.

A entrada coleta item/tamanho e, quando conhecido, tecido ou material. Todos começam em modo `review`: nenhum preço é inventado.

### Controle de pragas

- controle de pragas;
- limpeza de caixa d’água;
- vistoria técnica.

A entrada pode coletar tipo de praga, tipo de imóvel, área aproximada ou capacidade da caixa. Todos começam em modo `review`.

### Elétrica e manutenção

- visita técnica elétrica;
- instalação elétrica;
- reparo elétrico;
- quadro e disjuntores;
- chuveiro, tomadas e pontos;
- automação elétrica.

A entrada registra ponto/sistema afetado e urgência quando aplicável. Todos começam em modo `review`.

### Pequenos reparos

- pequenos reparos;
- elétrica;
- hidráulica;
- montagem e instalação;
- visita técnica.

A entrada registra categoria/necessidade e urgência. Todos começam em modo `review`.

### Portões e segurança

- conserto de portão;
- motor de portão;
- interfone;
- roldanas e mecânica;
- instalação/automatização;
- segurança eletrônica.

A entrada pode registrar marca/modelo, defeito e perfil do portão. Todos começam em modo `review`.

### Geral

Para outros prestadores:

- solicitação de orçamento;
- visita técnica.

Ambos começam em modo `review`.

## Intake estruturado

Cada serviço pode ter `intakeFields` com rótulo PT/EN/ES, tipo, obrigatoriedade e limite de tamanho.

O formulário público renderiza apenas os campos do serviço selecionado. O servidor revalida os campos configurados e rejeita um pedido quando um campo obrigatório não foi preenchido. Campos desconhecidos são ignorados.

A lista de tipos de equipamento também vem do serviço configurado; o frontend não presume mais que todo equipamento seja `split`.

## Garantia e retorno

Na conclusão de um atendimento, a operação pode registrar:

- valor final e pagamento;
- observações da execução;
- próxima data/motivo de retorno;
- data final e condições de garantia.

A recorrência automática continua sendo definida explicitamente por `returnAfterDays`; a IA não escolhe periodicidade nem garantia.

## Regras de segurança

1. Um playbook só cria rascunhos.
2. Serviços sem uma regra determinística de preço começam em `review`.
3. A engine de cotação continua determinística e server-side.
4. Perguntas de intake não alteram preço por conta própria.
5. Fotos continuam opcionais e limitadas às regras de upload do produto.
6. Consentimento de WhatsApp nunca é presumido pelo playbook.
7. Nomes e perguntas iniciais possuem PT/EN/ES.
8. A empresa deve revisar catálogo, preços, retorno e textos antes de publicar.

## Evolução

Novos verticais devem entrar como playbooks, não como novos aplicativos, desde que o fluxo fundamental continue sendo:

**cliente → orçamento → aprovação → agenda → execução → pagamento/status → retorno**.

Um novo app só deve ser considerado se o domínio operacional deixar de compartilhar esse fluxo e exigir modelo de dados ou regras substancialmente diferentes.
