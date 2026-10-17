# NestLocal entrega operacional de 17 de outubro de 2026

## Objetivo e alcance

Atender à solicitação de uso imediato com uma entrega incremental das jornadas já implementadas e testadas. Esta entrega não encerra a matriz C01–C21 nem certifica as integrações que dependem de provedor, aparelhos físicos e operação externa. O modo manual continua sendo o caminho disponível para comunicação com clientes.

## Correções e ferramentas da revisão

- Configurações e disponibilidade com salvamento recuperável, sem perder os campos em falhas da API.
- Controles e catálogo sem ultrapassar a largura de celulares de 320 px.
- Catálogo em rascunho, publicação transacional e preservação da conexão do canal ao editar modelos de mensagem.
- Orçamentos com itens, revisões imutáveis, validade e proteção contra aprovação ou edição de uma revisão antiga.
- Reagendamento invalida a confirmação anterior do cliente.
- Paginação, busca por situação e acesso a pedidos anteriores à amostra inicial de 100 registros.
- Checklist de execução, locais e equipamentos por cliente, importação com prévia e permissões específicas para valores e locais.
- Recebimentos manuais com histórico transacional; receita executada permanece separada de dinheiro recebido.
- Formulários preservados em memória e atualização ao retomar a tela Hoje.
- Resultados e ferramentas avançadas recolhidos na tela Hoje para reduzir a repetição de prioridades no celular.
- Rejeição de datas que não existem no calendário.

## Evidência de validação

Na revisão `aa52e6b9d9343d85fb9a84ac04161e3c3962545f`, os quatro workflows passaram. A suíte local contém 454 testes aprovados. A API real e o Firebase Admin SDK foram exercitados no emulador oficial, com isolamento, revogação de membros, pagamentos concorrentes, estorno manual, correção de receita, paginação de 125 pedidos, consentimento público, publicação, retentativa de pedido, revisão/validade do orçamento e reagendamento. O navegador também gravou configurações e disponibilidade por essa API e confirmou o resultado no banco emulado.

O hotfix separado #133 aprovou regras de negócio, integração com Firestore e navegador no SHA `d7f3cb59425671e8bc99f04f46ea81dad0f1f825`. Inclui falha HTTP 503, retentativa, valores preservados e largura em 320/390/1440 px.

A auditoria de nuvem inicial examinou 44 organizações, sem encontrar configurações ou registros NestLocal nos caminhos examinados. A auditoria ampliada conta grupos de coleções para detectar registros fora desses caminhos e verifica consultas mesmo sem empresas cadastradas. Ausência de dados não deve ser apresentada como prova de reconciliação de histórico existente.

Conferir os workflows do SHA final integrado, não apenas os das revisões acima. Confirmar também o deploy e os testes básicos no domínio oficial antes de declarar publicação.

## Condições da liberação incremental

Manter login Google/Hub, cobrança, preços e flags operacionais existentes. Não executar migração ou alteração automática de histórico. A auditoria ampliada deve concluir sem truncamento ou anomalia; qualquer registro histórico encontrado exige avaliação antes de ampliar a liberação. Preservar a revisão publicada anterior como referência de reversão de código.

As funcionalidades sem operação certificada permanecem desabilitadas ou explicitamente apresentadas como preparação manual. Esta liberação não habilita transporte, agendador, cobrança ou acesso adicional. O aceite do núcleo operacional não equivale ao aceite de todas as propostas do diagnóstico.

## Pendências que continuam abertas

- Push em segundo plano, agendador e testes de consentimento/revogação em aparelhos físicos.
- Despacho oficial pelo Connect e recibos de entrega, sujeitos ao contrato, autorização organizacional e aprovação dos modelos pelo provedor.
- Backup recuperável e restauração real em ambiente isolado. O manifesto existente não é um backup; a recuperação pontual da base estava desabilitada na leitura de nuvem.
- Matriz completa de perfis operacionais e mesclagem auditada de identidades multicanal.
- Sincronização bidirecional de calendário, importações multimodais completas e automações avançadas ainda não certificadas.
- Teste com Google/Hub reais, aparelhos físicos e piloto com prestadores. Sessões sintéticas não substituem essas evidências.

Não declarar o aplicativo inteiro 100% concluído enquanto esses pontos permanecerem abertos. Não atribuir resultado comercial, economia ou conversão que ainda não foram medidos.
