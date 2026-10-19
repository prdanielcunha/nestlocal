# Encerramento do push no logout

O botão Sair agora encerra a inscrição de push deste navegador antes de revogar a sessão e limpar a conta. Também tenta remover o vínculo da organização atual enquanto a sessão ainda é válida, com timeout de três segundos. Quando o contexto FCM já estava carregado, tenta remover seu token e limpa o cache em memória. O fluxo não cria inscrições novas, não pede permissões e não depende de nova infraestrutura.

Sair de uma conta encerra a inscrição do aparelho para todas as suas organizações. Já Desativar neste aparelho dentro de uma organização continua revogando somente aquele vínculo, preservando as demais organizações. Vínculos antigos no servidor que não puderem ser removidos imediatamente continuam sujeitos à expiração/limpeza já existente quando o provedor rejeita o endpoint.

Verificação: teste do cliente exercita ordem de cancelamento, limpeza do servidor indisponível, ausência de inscrição e preservação de outras organizações no opt-out individual. Regressões do app e do navegador devem passar antes da promoção; isto não comprova entrega física de notificações nem garante que um navegador que rejeitou unsubscribe tenha cancelado a inscrição.

Limites de liberação mantidos: consentimento Google deve ser concedido pela pessoa; recebimento de push deve ser observado em aparelho físico; ASR com áudio real exige chamada autenticada autorizada. Simulações e verificações sem autenticação não são essas provas. WhatsApp oficial pago e restauração paga permanecem no plano futuro, conforme a decisão de custo zero.
