# Importação de locais e equipamentos

O cliente é escolhido antes da importação em **Clientes → Carregar locais → Importar locais e equipamentos**. O modelo CSV pode ser baixado na própria tela. Também é possível colar uma planilha ou carregar um TSV em UTF-8, até 64 KiB e 400 linhas de dados.

Use as colunas `Local`, `Endereço`, `Cidade`, `Equipamento` e `Observações` (também aceitas em inglês e espanhol). Local, endereço e cidade são obrigatórios. Uma linha corresponde a um equipamento; repita os dados do local para incluir outros equipamentos. Uma linha sem equipamento cadastra somente o local. O limite continua sendo 20 locais por cliente e 20 equipamentos por local.

A prévia identifica linhas de origem, locais novos, locais já existentes e conflitos. Ela não grava locais nem altera o cliente. Como nas demais rotas protegidas, autenticação e limitação de frequência podem registrar metadados técnicos. Campos desconhecidos, equipamentos repetidos, observações conflitantes e limites excedidos exigem correção, sem descarte silencioso.

A confirmação cria somente os novos locais. Não substitui endereços, equipamentos, observações, histórico financeiro, consentimentos ou snapshots de pedidos existentes. Qualquer conflito bloqueia todo o lote. A transação confere o cliente, o conjunto de locais, a revisão da prévia e a capacidade antes de escrever. Um recibo por intenção e usuário protege retentativas concorrentes ou após perda de resposta. Reutilizar a mesma chave para conteúdo diferente retorna 409.

Proprietário/administrador ou capacidade canônica `sitesWrite` são exigidos pelo servidor nas duas rotas. Perfis campo, consulta e financeiro não podem importar. O destino é sempre a subcoleção do cliente dentro da organização autorizada; o navegador não acessa diretamente o banco. A auditoria registra responsável, referência do cliente e contagens, sem o conteúdo da planilha.

## Validação

A suíte inclui parsing PT/EN/ES, validação de limites e prévias. A integração usa a API e o Admin SDK reais com Firestore emulado: concorrência, retentativa, conflito, prévia obsoleta, preservação financeira/consentimento, permissões e disputa pelo vigésimo local. O navegador verifica upload local, revisão, edição que invalida a prévia e confirmação em 320/390/1440 px, com leitura posterior do banco.

As evidências automatizadas são sintéticas. Elas não certificam aparelhos físicos ou recuperação de backup. Essa entrega não implementa mesclagem de identidades multicanal, importação de mídia, transporte WhatsApp ou agenda bidirecional.
