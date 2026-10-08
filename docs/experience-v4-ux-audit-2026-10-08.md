# NestLocal — Auditoria de compreensão e experiência comercial (2026-10-08)

## Conclusão
O E2E anterior (40 jornadas em 8 larguras) demonstrava funcionamento de controles, **não compreensão da proposta por pessoas reais**. A demonstração 3.0 usava um funil abstrato (pedido → orçamento → agenda) e exigia leitura de texto extenso antes de responder como o cliente chega à empresa, onde conversa e se receberá avisos. Não há estudo moderado com usuários reais; até realizá-lo, **não afirmar UX validada**.

## Produto verificado no código atual
| Pergunta de primeiro uso | Realidade atual, fonte no repositório |
|---|---|
| Quem encontra o cliente? | A própria empresa, via redes sociais, WhatsApp, Google, indicações e seu site. NestLocal oferece página compartilhável no domínio `nestlocal.millionsnest.com/<slug>` (`web/live.js`, `function page()`), **não é marketplace de descoberta**. |
| Como o pedido chega? | Link publicado → formulário → `POST /api/public/stores/:storeSlug/requests` → pedido no painel. WhatsApp pessoal permanece fora do app, podendo cadastrar manualmente via formulário interno; conversa não é importada automaticamente. |
| Faz orçamento? | Catálogo com regras e serviço fixo/revisão, aprovação do cliente por token de acompanhamento, ou orçamento manual (`server.mjs`, `src/domain/quote.mjs`, `web/live.js`). |
| Agenda? | Agenda interna, com data/período/responsável no pedido; cliente pode confirmar ou pedir mudança no acompanhamento por token. **Não presumir integração com calendário externo.** |
| O que acontece na data? | Pendências/ações em Hoje, agenda. Não foi encontrada garantia de push, notificação nativa ou envio automático à empresa para cada agendamento. |
| Lembretes ao cliente? | `POST /api/organizations/:orgId/nestlocal/messages/prepare-due-reminders` prepara itens `ready` na outbox sob consentimento; **preparar não significa entregar**. Recurso oficial depende de canal conectado, consentimento e política do provedor. |
| Pode funcionar sem WhatsApp? | Sim. Comunicação manual ou por email/telefone, página, orçamentos, agenda e operação permanecem possíveis sem número conectado. |

## Falhas de UX detectadas (avaliação heurística de código e estrutura, não teste com usuários)
- **P0 — Modelo mental incorreto:** o visitante não sabe se NestLocal é marketplace, chatbot, agenda ou sistema para uso depois do contato. Pergunta original: “onde meu cliente chega?”. 
- **P0 — Ambiguidade de canal:** mistura página própria, WhatsApp e painel; “mensagens” parecia prometer inbox integrado sem base para WhatsApp pessoal.
- **P0 — Promessa de notificações:** simulação mostra agendamento e retorno sem esclarecer que isso não implica alerta automático em data.
- **P1 — Excesso de superfícies:** hero, cards de lugares, explicação, progresso, duas janelas, responsabilidade e FAQ demandavam rolagem e leitura para chegar à proposta.
- **P1 — Prioridade móvel:** duas telas concorrentes por espaço; na primeira visita o dono precisa entender o que aparece **no painel dele** antes do lado do cliente.
- **P1 — Testes insuficientes:** “40 jornadas passam” mede interação/overflow, não compreensão, confiança, disposição a contratar ou desempenho da tarefa.

## Nova direção implementada na PR
- Uma pergunta de primeira visita: **“Como seu cliente chega até você?”**. Escolhas reais: WhatsApp pessoal, Instagram/redes, site próprio.
- Cada escolha mostra uma **linha de transporte verificável**: WhatsApp → cadastro manual ou compartilhamento do link; Instagram/site → link → formulário da empresa → pedido no painel.
- Deixar explícito o que fica no canal externo e o que entra no NestLocal. Não representar DM/WhatsApp como caixa de entrada interna.
- Simulação em **duas perspectivas** e, no celular, uma só perspectiva por vez (dono inicialmente). Alternância reversível entre dono e cliente.
- Diferenciar “NestLocal organiza” de “empresa confirma”, orçamento por regra de orçamento revisado, agenda interna de lembretes externos.
- Na etapa da agenda e no resumo final: **“O compromisso aparece no NestLocal; não há garantia de aviso automático no WhatsApp ou celular.”**
- Marketing: foco no resultado tangível “Do atendimento à próxima venda, sem mudar seus canais”. Comunicação premium, sem camadas explicativas intermináveis.

## Pesquisa externa usada como referência (separada dos fatos do NestLocal)
1. Nielsen Norman Group, *10 Usability Heuristics*: compatibilidade com o mundo real, visibilidade de estado e reconhecimento — https://www.nngroup.com/articles/ten-usability-heuristics/
2. NN/g, *Progressive Disclosure*: mostrar primeiro a ação principal e deixar detalhes em contexto — https://www.nngroup.com/articles/progressive-disclosure/
3. Jobber, *Online Booking*: formulário compartilhável por site/social e distinção entre solicitação e reserva confirmada — https://getjobber.zendesk.com/hc/en-us/articles/13808363916951-Online-Booking
4. Jobber, *Client Hub*: o cliente encontra a empresa fora do software, solicita serviço e acompanha orçamento, agenda e pagamento por link — https://www.getjobber.com/features/client-hub/
5. Housecall Pro, *Customer Notifications*: separar ações de agenda de notificações configuradas por canal — https://help.housecallpro.com/en/articles/14171435-customer-notifications-in-settings
6. Baymard, *DTC UX Benchmark*: comunicar as características relevantes na primeira tela, sem obrigar o visitante a descobrir isso em páginas profundas — https://baymard.com/research-articles/dtc-benchmark

## Critérios de aceite técnico automatizados
- Testes Node de todos os três canais, nos idiomas PT/EN/ES, transições e política de mensagens.
- Chromium 320/360/390/430/768/1024/1280/1440: 40 jornadas sem erros de JavaScript ou overflow.
- No celular, alternar perspectivas sem deixar o estado inconsistente após reinício.
- CTA ao Hub preservado. Simulação não envia mensagens, não autentica nem grava registros reais.
- Checagens pós-deploy no domínio público, sem alterar a API.

## O que falta para classificar UX como excelente (e não só release tecnicamente correto)
- **Teste de compreensão com 5–8 prestadores novos**, sem orientação: em 10–15 s devem responder “o que é”, “onde chega o cliente”, “onde chega o pedido” e “quem faz o agendamento”. Coletar respostas reais, sem induzir.
- **Tarefas práticas com cinco usuários mobile**: distinguir canal externo do painel, simular orçamento e agendamento; medir taxa de conclusão, tempo e pontos de dúvida.
- **Estudar engajamento e conversão**: iniciações por canal, abandono por etapa, visita à página de cadastro, origem. Telemetria só agregada; sem PII.
- **Produto futuro (não confundir com o escopo da demo)**: avisos realmente entregues à empresa/cliente por canais opt-in, indicação clara do status de entrega, integração autorizada com agenda externa se demandada, link copiável no onboarding, controle de consentimento e políticas de templates. Não anunciar como presente antes de implementar e comprovar canário.
