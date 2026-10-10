# NestLocal — auditoria sênior de UX/UI e NestAI (10/10/2026)

## Escopo e limitações
Revisão de código e fluxos em `web/live.js`, `web/experience.js`, `web/index.html`, `web/operations.css`, `web/entry.css`, `web/calendar.js`, `server.mjs`, `src/nestai.mjs`, testes e workflow de produção. Não equivale a teste moderado com clientes reais ou certificação de autenticação Hub em navegador sem credenciais. Não se afirma cobertura total de uso em produção.

## Jornada de primeira visita (modelo mental correto)
1. O cliente chega por **canais da empresa**: WhatsApp pessoal, Instagram, site ou indicação.
2. A empresa pode **registrar manualmente** o pedido ou compartilhar **seu link de serviços**.
3. O formulário do link entra em **Pedidos** no painel. A conversa externa **não é** importada automaticamente.
4. A empresa configura/revisa orçamento, o cliente aprova pelo link; o prestador confirma agenda e execução.
5. O app acompanha datas, resultados, pagamento e próximo contato. Preparar lembrete **não significa entregar** notificação ao cliente.

## Mudanças aplicadas nesta PR
- **P0 Foco:** função pura de decisão `chooseOperationalFocus`: leitura apenas, configuração, pedido prioritário, serviços, publicação, link divulgado ou operação em dia. Nunca inventa atividades.
- **P0 Próximo passo acessível:** em Hoje, CTA abre pedido real via controle existente `data-open-request`; visitas sem pedidos apontam para o link publicado ou entrada manual.
- **P0 NestAI contextual:** contato sugerido exige ação explícita, reaproveita assistente já existente e o rascunho de follow-up já oferecido no fluxo. Sem enviar mensagens, criar preços ou consumir IA automaticamente ao abrir a home.
- **P1 Navegação:** barra móvel com Hoje, Pedidos, Agenda, Clientes e Mais, com links completos no menu extra; mantém funções desktop.
- **P1 Divulgação progressiva:** relatórios e blocos de inteligência mais avançados continuam disponíveis em área expansível; pendências e fila de ação continuam visíveis.
- **P1 Localização:** cópias de apoio para português, inglês e espanhol.
- **Sem alterações no servidor, banco, Stripe, autenticação, RBAC ou migrações.**

## Riscos e próximos passos priorizados

| Prioridade | Achado | Próximo desenvolvimento seguro |
| --- | --- | --- |
| P0 | `web/live.js` delega login ao Hub; o texto de `AGENTS.md` exige acesso nativo ao domínio. Existem expectativas divergentes e fluxo de recuperação que volta ao Hub. | Resolver padrão canônico junto ao Hub, testes de conta errada, handoff expirado e PWA standalone; **não** substituir autorização de servidor. |
| P0 | `subscriptionGate()` usa valores fixos antigos (R$ 79/129/199) sem confirmação contra catálogo Stripe/Founders. | Fazer o Hub devolver preço/oferta/limite por plano; validar promocional Founders **R$ 49,90** conforme decisão de produto e pacote IA antes de exibir/publicar. Não configurar Stripe a partir de suposições. |
| P0 | E2E autenticado precisa comprovar navegação, chamadas e estados. | Exigir GitHub Actions unitário + Playwright 320/390/1440 e verificação de sessão; bloquear promoção se falhar. |
| P1 | Cliente pode confundir outbox pronta com mensagem enviada. | Explicitar `rascunho / pronta para envio / entregue / falhou` somente quando houver sinais verificáveis do canal. |
| P1 | Integração de agenda depende de feed/arquivo/autorização; não equivale a notificações push próprias. | Melhorar onboarding com status real de feed, sincronização e orientação de notificações locais. |
| P1 | Captura de conversa pelo WhatsApp pessoal não é automática. | Assistente de colar conversa com extração NestAI + revisão humana, limites mensais, consentimento, minimização de dados e criação de pedido só após confirmação. |
| P2 | Painel possui muitas métricas; primeiro acesso não deveria exigir leitura de analytics. | Pesquisa com 5–8 prestadores; medir tempo até primeiro pedido, orçamento e link compartilhado. |

## Critérios de qualidade/aceite
- Fluxos de novo negócio, catálogo incompleto, cliente com pedido, ausência de urgência e trial expirado.
- Layout e toque em 320/390/768/1440; sem overflow, menu Mais acessível por teclado e toque.
- PT/EN/ES, `aria-current` e estados read-only.
- NestAI só sob demanda, sem mensagens externas involuntárias, sem cruzamento de tenant e sem preço alucinado.
- Testes de backend e E2E verdes; só depois revisar promoção para `main` e, separadamente, `production`.
- Validação moderada de compreensão ainda pendente; NÃO classificar UX como comprovadamente excelente antes de usuários reais.

## Release compatível com produção
A branch `production` possuía duas atualizações não integradas em `main`: Opportunity Capture, Copilot Preview, tarefas e ações. Este patch foi refeito sobre a árvore de produção para **não substituir nem rebaixar** essas capacidades. O cartão de próxima ação usa o priorizador existente e dá passagem aos rascunhos comerciais em aberto. O campo de captura, os lembretes de tarefa, o menu e o painel avançado permanecem funcionando. Depende de testes automatizados e validação no domínio antes de classificar release como pronto.
