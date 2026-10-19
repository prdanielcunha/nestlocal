# NestLocal — Plano de backup, restauração e portão de segurança (C20)

**Status:** ferramentas read-only preparadas; **backup de nuvem e restauração ainda não executados**. Nenhum passo deste documento autoriza restaurar dados no ambiente publicado.

## Decisão de custo zero em 18 de outubro de 2026

O responsável determinou que o projeto começa com custo zero. O backup gerenciado diário, a retenção de sete dias e o ensaio de restauração com cobrança ficam **adiados para avaliação após o projeto gerar lucro**, sujeitos a nova aprovação explícita dos custos. Não criar agendamentos, habilitar PITR, criar banco de recuperação ou executar serviços pagos como consequência deste plano. Não solicitar novamente essa ativação enquanto a decisão continuar vigente.

O planejamento está registrado no app em **Serviços → Melhorias futuras**, visível à administração do ecossistema. É uma nota informativa, sem botão de ativação, chamada de API ou cobrança. Esse registro não é um backup e não certifica recuperação de dados. As instruções técnicas abaixo ficam preservadas para quando a etapa for autorizada.

## Restrições invioláveis

- O Firestore pode ser compartilhado com o Hub e outros produtos MillionsNest. Uma exportação ou restauração da base inteira inclui dados e custos externos ao NestLocal. Nunca selecionar banco ou projeto por inferência do domínio.
- Aprovar por escrito com o administrador de infraestrutura: projeto de origem e destino, bucket e região, orçamento de operações, direitos IAM, período de retenção, janela de congelamento e plano de reversão.
- O banco de destino deve ser **novo e isolado, sem aplicações, usuários finais, Webhooks de Stripe, Connect, NestAI ou notificações conectados**. Restaurar sobre produção é proibido. Backup gerenciado do Firestore exige o mesmo projeto e localização do backup; usar outro `databaseId`, nunca `(default)`. Exportação/importação pode usar outro projeto autorizado.
- Nenhum segredo nem arquivo exportado de Firestore deve ser publicado em PR, issue, artifact do GitHub Actions, commit ou logs.

## Pré-checagem read-only já implementada

Com credenciais ADC autorizadas (em terminal confiável), variáveis de ambiente `FIREBASE_PROJECT_ID` e `NESTLOCAL_AUDIT_SALT` com no mínimo 16 caracteres, e escopo explícito de organizações:

```bash
# Ambiente de origem: arquivo local privado, 0600 e sem PII.
node scripts/nestlocal-recovery-manifest.mjs \
  --orgs ORG_ID_A,ORG_ID_B \
  --capture /secure/location/nestlocal-source-manifest.json

# Após restore autorizado em banco novo e isolado, configurar o MESMO salt,
# FIREBASE_PROJECT_ID e FIRESTORE_DATABASE_ID do destino.
# Ex.: FIRESTORE_DATABASE_ID=nestlocal-recovery-drill no mesmo projeto
# para backup gerenciado, ou projeto diferente para exportação/importação.
node scripts/nestlocal-recovery-manifest.mjs \
  --orgs ORG_ID_A,ORG_ID_B \
  --verify /secure/location/nestlocal-source-manifest.json
```

O script registra contagens de pedidos, clientes, reservas e ajustes financeiros, e HMAC de configurações/catálogo. Ele nunca lê nem grava documentos de pagamentos ou clientes completos para fora do processo, e **não substitui um backup**. Os registros ainda podem mudar durante uso normal; a comparação deve ocorrer em uma janela de consistência controlada.

Manifestos vazios, seções ausentes, contagens inválidas ou assinaturas malformadas são rejeitados, inclusive antes de consultar o destino. Uma comparação aprovada emite `NESTLOCAL_RECOVERY_MANIFEST_MATCH`: confirma somente contagens e configurações assinadas. Esse resultado não certifica o conteúdo dos pedidos/clientes, subcoleções financeiras ou integridade completa da restauração; a revisão adicional abaixo continua obrigatória.

## Procedimento de recuperação que ainda exige execução operacional

1. Confirmar a política de backups gerenciados do Firestore (disponibilidade, retenção, região, custos e permissões). Registrar ID e timestamp do ponto recuperável, em armazenamento com controle de acesso, sem compartilhar segredos.
2. Realizar uma exportação consistente suportada pelo Google Cloud para destino privado ou utilizar um backup gerenciado existente. Documentar ID da operação e seu resultado **somente após confirmação de sucesso**.
3. Para backup gerenciado, restaurar em um ID de banco novo no mesmo projeto/localização. Para exportação/importação, usar o projeto de recuperação previamente definido. Em ambos os casos, manter o destino isolado de todas as aplicações, comunicações, autenticações reais e pagamentos. Aguardar o sucesso da operação antes de comparar.
4. Comparar o manifesto de origem com o ambiente restaurado. Inspecionar adicionalmente uma amostra autorizada de pedidos, histórico financeiro, permissões, agenda e dados de serviços, sem logar PII. As contagens sozinhas não demonstram integridade integral.
5. Ensaiar a recuperação do front e da API com usuários sintéticos. Confirmar que nenhum webhook, WhatsApp, push ou cobrança foi disparado.
6. Guardar um relatório assinado de RPO/RTO observados, comprovantes de operação, falhas e ações corretivas. Somente o administrador responsável aprova o portão de produção.

## Cuidados de negócio

- Preservar login Google, vínculo com o Hub, assinaturas Stripe/trials, MusicScale e NestFinance. Não reescrever ou importar sobre assinaturas externas.
- Não rodar `gcloud firestore import` ou exclusões contra o projeto de produção. Não emitir links públicos para o bucket.
- Testar a capacidade de recuperar **dados antigos e novos** e eventos de ajuste financeiro; a subcoleção `nestlocal_requests/*/payment_events` deve estar incluída no backup e revisada no ensaio.
- A execução do backup agendado, a verificação IAM e o primeiro ensaio de restauração permanecem **pendentes**, até que haja credenciais e ambiente isolado confirmados.

## Critério de aceite C20

O manifesto v2 identifica `(projectId, databaseId)` e rejeita a própria origem, inclusive antes das consultas de verificação. Manifestos v1 continuam aceitos entre projetos diferentes, mas não demonstram isolamento de bancos no mesmo projeto. O SDK de verificação seleciona explicitamente o banco; a API publicada continua ligada ao banco existente, sem alteração de conexão.

Referência oficial: https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases/restore

Backup recuperável comprovado, restauração isolada concluída, comparação automática aprovada, revisão manual de dados, confirmação de RPO/RTO e rollback documentados. Sem esses itens C20 permanece **parcial**.
