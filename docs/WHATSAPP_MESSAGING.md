# WhatsApp Messaging Readiness

## Princípio

O NestLocal não envia mensagens automaticamente só porque possui o telefone do cliente.

Para cada categoria, o sistema precisa saber:

1. qual empresa está entrando em contato;
2. qual consentimento o cliente forneceu;
3. qual finalidade foi autorizada;
4. qual template aprovado será usado quando a conversa for iniciada pela empresa;
5. se existe conexão oficial com o provedor.

## Consentimentos

### Atualizações do pedido

Consentimento por pedido:

- categoria: `service_update`;
- texto mostra explicitamente o nome da empresa;
- não concede permissão para marketing ou reativação futura.

### Lembretes futuros

Consentimento separado e opcional:

- categoria: `maintenance_reminder`;
- persistido no histórico do cliente quando aceito;
- destinado a manutenção, retorno ou recorrência ligada ao serviço.

Não marcar a opção não revoga automaticamente um consentimento anterior; uma revogação explícita deverá ser tratada separadamente quando a integração oficial de mensagens estiver ativa.

## Templates

As configurações aceitam os nomes dos templates aprovados para:

- atualização do serviço;
- lembrete de manutenção/retorno.

O navegador não pode marcar o provedor como conectado.

## Outbox

A rota administrativa de preparação cria um registro em `nestlocal_message_outbox`.

Estados atuais:

- `ready`: consentimento, template e conexão compatíveis;
- `blocked`: existe uma razão objetiva para não enviar.

Razões de bloqueio:

- `WHATSAPP_OPT_IN_REQUIRED`;
- `MESSAGE_TEMPLATE_REQUIRED`;
- `MESSAGING_PROVIDER_NOT_CONNECTED`.

A preparação é idempotente por categoria + alvo + template + dia.

Nesta fase o outbox **não envia a mensagem**. A integração oficial deverá consumir somente registros elegíveis, registrar o ID retornado pelo provedor e processar webhooks de entrega/falha antes de marcar uma mensagem como enviada ou entregue.

## Regra de produto

IA pode sugerir conteúdo, mas nunca substituir:

- consentimento;
- categoria;
- template aprovado;
- janela de atendimento;
- regras do provedor;
- opt-out.

A conexão futura deve oferecer escalonamento claro para atendimento humano.
