# Perfis operacionais canônicos

O perfil reside em `organizations/{orgId}/members/{uid}.appAccess.nestlocal.profile`, com cópia legada sincronizada pela mesma transação. Não existe identidade ou autorização paralela no navegador. Login Google/Hub, associação ativa, acesso ao app e assinatura continuam obrigatórios.

| Perfil | Leitura | Escrita |
|---|---|---|
| Proprietário/administrador canônico | Empresa | Administração existente, independente do perfil de membro |
| Acesso anterior (`legacy`) | Comportamento já publicado | Concessões existentes preservadas |
| Atendimento/operação (`operations`) | Empresa | Operação existente; valores/locais dependem das concessões específicas |
| Financeiro (`finance`) | Empresa | Valores finais, recebimentos e orçamentos; não altera agenda, execução, clientes ou equipe |
| Técnico (`field`) | Somente pedidos atribuídos ao próprio UID | Iniciar/concluir execução, anotações, marcar itens existentes e evidências dos próprios serviços |
| Consulta (`viewer`) | Empresa | Sem alteração de negócio ou uso de IA; canais pessoais de calendário/notificação podem ser revogados |

Somente um administrador autorizado atribui perfis. Perfis desconhecidos falham fechados; novos perfis não são aplicados automaticamente a membros existentes. O desligamento preserva concessões para uma reativação explícita, sem dispensar a checagem de acesso ativo a cada requisição.

## Fronteiras do técnico

- Bootstrap, lista paginada e agenda consultam atribuições pelo UID canônico. A paginação avança por ID; filtros de situação não expõem contagens globais. Não depende de uma amostra dos últimos pedidos da empresa.
- A resposta usa uma lista explícita de campos operacionais. Exclui orçamento, pagamentos, métricas, catálogo de preços, cadastros de clientes, equipe, tokens e caminhos privados de arquivos.
- Detalhe, fotos e evidências exigem atribuição. A alteração de execução revalida o responsável dentro da transação.
- Não pode alterar agenda, responsável, preço, recebimento nem criar, remover ou renomear itens do checklist. Pode marcar os itens definidos pela operação.
- Texto operacional livre pode conter informações escritas pela própria empresa; a restrição não é um redator automático de texto.
- A interface específica evita mostrar totais financeiros fictícios ou controles que a API não permite usar.

## Validação

Executar os testes de domínio e o workflow de API/Firestore emulado no SHA final. Os cenários incluem 126 atribuições paginadas, leitura cruzada, revogação de atribuição, bloqueio de rotas alternativas, preservação do checklist, consulta sem escrita e financeiro sem alteração de execução. Navegação de técnico em 320/390/1440 px e recebimento financeiro devem confirmar os valores salvos no banco emulado.

Essa validação não certifica dispositivos físicos, transporte de push/Meta, sincronização bidirecional ou recuperação de backup em nuvem. Essas pendências permanecem separadas e não são encerradas por este lote.
