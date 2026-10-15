# NestLocal — Plano de backup, restauração e portão de segurança (C20)

**Status:** ferramentas read-only preparadas; **backup de nuvem e restauração ainda não executados**. Nenhum passo deste documento autoriza restaurar dados no ambiente publicado.

## Restrições invioláveis

- O Firestore pode ser compartilhado com o Hub e outros produtos MillionsNest. Uma exportação ou restauração da base inteira inclui dados e custos externos ao NestLocal. Nunca selecionar banco ou projeto por inferência do domínio.
- Aprovar por escrito com o administrador de infraestrutura: projeto de origem e destino, bucket e região, orçamento de operações, direitos IAM, período de retenção, janela de congelamento e plano de reversão.
- O projeto de destino deve ser **isolado, sem usuários finais, sem Webhooks de Stripe, Connect, NestAI ou notificações habilitados**. Restaurar sobre produção é proibido.
- Nenhum segredo nem arquivo exportado de Firestore deve ser publicado em PR, issue, artifact do GitHub Actions, commit ou logs.

## Pré-checagem read-only já implementada

Com credenciais ADC autorizadas (em terminal confiável), variáveis de ambiente `FIREBASE_PROJECT_ID` e `NESTLOCAL_AUDIT_SALT` com no mínimo 16 caracteres, e escopo explícito de organizações:

```bash
# Ambiente de origem: arquivo local privado, 0600 e sem PII.
node scripts/nestlocal-recovery-manifest.mjs \
  --orgs ORG_ID_A,ORG_ID_B \
  --capture /secure/location/nestlocal-source-manifest.json

# Após um restore autorizado em um projeto diferente, configurar
# FIREBASE_PROJECT_ID para esse projeto isolado, com o MESMO salt.
node scripts/nestlocal-recovery-manifest.mjs \
  --orgs ORG_ID_A,ORG_ID_B \
  --verify /secure/location/nestlocal-source-manifest.json
```

O script registra contagens de pedidos, clientes, reservas e ajustes financeiros, e HMAC de configurações/catálogo. Ele nunca lê nem grava documentos de pagamentos ou clientes completos para fora do processo, e **não substitui um backup**. Os registros ainda podem mudar durante uso normal; a comparação deve ocorrer em uma janela de consistência controlada.

## Procedimento de recuperação que ainda exige execução operacional

1. Confirmar a política de backups gerenciados do Firestore (disponibilidade, retenção, região, custos e permissões). Registrar ID e timestamp do ponto recuperável, em armazenamento com controle de acesso, sem compartilhar segredos.
2. Realizar uma exportação consistente suportada pelo Google Cloud para destino privado ou utilizar um backup gerenciado existente. Documentar ID da operação e seu resultado **somente após confirmação de sucesso**.
3. Criar um projeto Firebase de recuperação isolado, sem comunicações externas, autenticações reais ou pagamentos, e importar nele o backup utilizando o procedimento oficial adequado à modalidade utilizada.
4. Comparar o manifesto de origem com o ambiente restaurado. Inspecionar adicionalmente uma amostra autorizada de pedidos, histórico financeiro, permissões, agenda e dados de serviços, sem logar PII. As contagens sozinhas não demonstram integridade integral.
5. Ensaiar a recuperação do front e da API com usuários sintéticos. Confirmar que nenhum webhook, WhatsApp, push ou cobrança foi disparado.
6. Guardar um relatório assinado de RPO/RTO observados, comprovantes de operação, falhas e ações corretivas. Somente o administrador responsável aprova o portão de produção.

## Cuidados de negócio

- Preservar login Google, vínculo com o Hub, assinaturas Stripe/trials, MusicScale e NestFinance. Não reescrever ou importar sobre assinaturas externas.
- Não rodar `gcloud firestore import` ou exclusões contra o projeto de produção. Não emitir links públicos para o bucket.
- Testar a capacidade de recuperar **dados antigos e novos** e eventos de ajuste financeiro; a subcoleção `nestlocal_requests/*/payment_events` deve estar incluída no backup e revisada no ensaio.
- A execução do backup agendado, a verificação IAM e o primeiro ensaio de restauração permanecem **pendentes**, até que haja credenciais e ambiente isolado confirmados.

## Critério de aceite C20

Backup recuperável comprovado, restauração isolada concluída, comparação automática aprovada, revisão manual de dados, confirmação de RPO/RTO e rollback documentados. Sem esses itens C20 permanece **parcial**.
