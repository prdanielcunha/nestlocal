# Continuidade operacional — permissões e importação

Esta revisão corrige dois problemas encontrados na entrega anterior e acrescenta a abertura local de CSV/TSV. Não altera preços, autenticação, recursos de nuvem, transporte de mensagens ou flags.

## Equipe

O servidor aceita as permissões canônicas no formato de lista e no formato de mapa. Ativar ou desativar uma vaga preserva as demais concessões. A revogação continua sendo aplicada por `enabled=false` a cada requisição, inclusive a sessões existentes.

Somente proprietário, administrador da organização ou administrador canônico do ecossistema pode conceder ou retirar edição de valores/recebimentos e gerenciamento de locais/equipamentos. A permissão financeira também protege a emissão e edição de orçamentos, impedindo alteração indireta de valores por outro endpoint. Concessões explícitas falsas prevalecem sobre permissões antigas. As duas cópias de associação são sincronizadas no mesmo commit e a alteração gera auditoria sem contatos. As permissões inerentes de proprietários/administradores não são reduzidas por essas opções.

Essas são permissões de escrita. Não constituem perfis completos de leitura restrita ou de técnico limitado aos próprios serviços. Os membros habilitados ainda acessam os registros operacionais da empresa; não apresentar a opção financeira como ocultação de valores.

## Clientes

CSV/TSV UTF-8 é interpretado no aparelho, com limite explícito de 64 KiB e 100 clientes, suporte a BOM, vírgula, ponto e vírgula, tabulações, aspas escapadas e campos multilinha. Arquivos excedentes ou malformados são rejeitados sem truncamento silencioso. Cabeçalhos PT/EN/ES reconhecidos permitem reordenar campos; sem cabeçalho, permanece a ordem da tabela exibida na tela.

A prévia não grava. Editar a lista invalida a revisão anterior. O servidor valida datas reais tanto na prévia quanto na gravação, rejeita revisões desatualizadas e revalida dados dentro da transação. Campos de endereço ausentes não apagam o cadastro existente. A importação não cria consentimento para comunicação.

Uma chave de operação permite repetir a confirmação após perda de resposta sem duplicar a auditoria; reutilizar a chave com conteúdo diferente gera conflito. Texto e arquivos não são enviados a um serviço externo de IA.

## Validação e limites

Executar a suíte de domínio, a API real com o emulador oficial e a navegação em 320/390/1440 px no SHA final antes de publicar. Os cenários novos incluem concessão/revogação, tentativa de autoelevação, preservação de permissões antigas, datas inválidas, prévia sem escrita, concorrência/repetição, conflito com atualização externa e manutenção de endereço/consentimento.

O Connect permanece dependente da aprovação dos modelos pela Meta: inventário registrado no PR 337 do Connect informa zero modelos aprovados. Não habilitar envios a partir desta revisão.

Continuam em aberto backup com restauração isolada real, push em aparelhos físicos, perfis completos com escopo de leitura, importação de áudio/imagens/PDF/ZIP e sincronização bidirecional de agenda. A validação sintética também não substitui o piloto com login Google/Hub e empresas reais.
