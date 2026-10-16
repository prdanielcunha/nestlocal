# NestLocal — C13: Web Push e lembretes seguros

Situação em 15/10/2026: **infraestrutura implementada em branch e desabilitada por padrão; transporte e agendamento reais ainda não homologados em aparelho físico**.

## Princípios

1. Permissão explícita por usuário e aparelho; jamais ativar por redirecionamento, login ou aceitação de marketing.
2. Notificação genérica, sem nomes, telefone, endereço, orçamento, mensagem de cliente, tokens de rastreio ou outros dados pessoais.
3. Um token FCM é gravado somente na coleção privada `organizations/{org}/nestlocal_push_devices` e associado ao UID autorizado. Nunca publicá-lo em logs, painel, anexos de CI ou Analytics.
4. Mudança de organização nunca autoriza enviar para outro tenant. O worker revalida membership de cada UID ao executar.
5. `providerAccepted` significa apenas aceito pelo Firebase; **não garante que a notificação apareceu no telefone**.
6. Mensagem preparada no NestLocal não equivale a envio por WhatsApp. Esta funcionalidade é independente do Connect.

## Habilitação no ambiente de teste

Exige projeto Firebase `millionsnest`, Cloud Messaging API e credenciais ADC apropriadas. VAPID é uma **chave pública** obtida da configuração Web Push oficial do Firebase; a chave privada correspondente fica somente sob controle do provedor. Configurar no backend NestLocal:

- `NESTLOCAL_PUSH_ENABLED=true`
- `NESTLOCAL_WEB_PUSH_VAPID_PUBLIC_KEY=<chave publica VAPID>`

Sem essas configurações, o endpoint de configuração responde `enabled=false`, os controles não aparecem e o cadastro/envio falham fechado. A implantação não altera Stripe nem a identidade Google existente.

O usuário abre o NestLocal pelo HTTPS e clica **Ativar notificações**. Em iOS, testes precisam considerar a instalação da PWA na tela inicial e as permissões do sistema. O aplicativo obtém o token Firebase após o clique, grava a inscrição para o UID/organização e pode enviar um teste manual. O usuário pode desativar o canal nesse aparelho a qualquer momento. A aplicação não persiste o token bruto em `localStorage`.

### Endpoints

- `GET /api/organizations/:orgId/nestlocal/push/config`: chave pública, disponibilidade e aviso de entrega não garantida.
- `POST /api/organizations/:orgId/nestlocal/push/devices`: consentimento explícito e inscrição. Token existente de outro UID não pode ser assumido.
- `DELETE /api/organizations/:orgId/nestlocal/push/devices`: revogação somente pelo UID registrado.
- `POST /api/organizations/:orgId/nestlocal/push/test`: envio genérico para o próprio aparelho, limitando taxa e devolvendo confirmação de aceite do provedor, não de leitura ou entrega.

Todas as rotas exigem autenticação Hub/Google e escopo organizacional, com validação de assinatura e acesso já usados pela API NestLocal.

## Lembretes em segundo plano

O executor `scripts/nestlocal-push-reminders.mjs` não possui endpoint público. Requer credencial ADC e lista explícita de organizações.

```bash
# Simulação read-only, sem enviar e sem reservar idempotência
FIREBASE_PROJECT_ID=millionsnest \
  node scripts/nestlocal-push-reminders.mjs --orgs ORG_TEST

# Execução real somente após habilitação administrativa em homologação,
# validação do agendamento e conta de serviço de privilégios mínimos.
NESTLOCAL_PUSH_ENABLED=true \
NESTLOCAL_PUSH_SCHEDULER_ENABLED=true \
FIREBASE_PROJECT_ID=millionsnest \
  node scripts/nestlocal-push-reminders.mjs --orgs ORG_TEST --send
```

O worker compara `dueDate`/`dueTime` no fuso horário original da tarefa, manda aviso genérico ao autor da tarefa com aparelho opt-in e registra `reserved` em transação antes da tentativa FCM. Executar novamente a mesma data não envia de novo. Um resultado ambíguo fica `needs_review`, **sem retentativa automática**. A contagem de aceite do provedor não comprova entrega.

O scan de tarefas e aparelhos é limitado: alto volume interrompe a execução para revisão humana, não faz envio parcial silencioso. Sem scheduler provisionado, o executor não executa sozinho. Cloud Scheduler/Cloud Run Job com conta de serviço restrita, segredo e escopo explícito deve ser aprovado e provisionado fora do chat antes de considerar o recurso ativo.

## Portão de aceite — não cumprido

- Criar organização de homologação com dados sintéticos, verificar permissões Firebase/FCM e índices do Firestore.
- Testar Chrome Android, Safari/iOS PWA instalada, desktop e navegador sem suporte; ativação/revogação, organização trocada, UID revogado e device token expirado.
- Confirmar teste com app fechado e com app aberto, inclusive região de tempo, múltiplos aparelhos e horário de verão.
- Executar job de homologação duas vezes e provar que não ocorreu duplicação; validar estados `provider_accepted` e `needs_review`.
- Provisionar agendador seguro e medir custo/volume; bloquear tráfego real até aprovação.
- Documentar entrega observada no aparelho, sem fotografar nem publicar dados de clientes.

**Não declarar C13 concluído ou push real ativo antes dessas provas.**
