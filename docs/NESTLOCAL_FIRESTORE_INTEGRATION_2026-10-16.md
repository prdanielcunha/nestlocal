# Homologação da API com Firestore emulado

## Evidência executada

Em 16/10/2026, a suíte `npm run check` passou com 453 testes. A suíte de integração executou a API `server.mjs`, o Firebase Admin SDK e transações no emulador oficial do Firestore. As sessões usadas são sintéticas, mas passam pela resolução real de sessão, usuário, organização, membership e assinatura da API; não foi adicionado bypass de autenticação ao aplicativo.

Sete cenários passaram:

1. Salvar capacidade e reler os campos aninhados, preservando uma configuração preexistente.
2. Rejeitar sessão de outra organização e escrita financeira por membro sem permissão.
3. Desabilitar e reabilitar um membro, conferir os dois documentos canônicos/compatíveis e negar acesso à sessão já existente enquanto revogada.
4. Gravar pagamento parcial em duas requisições concorrentes sem duplicar evento; registrar pagamento integral e reversão manual; conferir revisão e soma dos deltas.
5. Corrigir duas vezes concorrentemente o valor de um serviço concluído, reconhecendo somente a diferença e criando um ajuste.
6. Paginar 125 pedidos sem lacunas/duplicatas, encontrar o pedido antigo e não expor hashes dos links privados.
7. Enviar pedido público e reler consentimento de manutenção no campo canônico.

As falhas de capacidade, revogação de acesso e consentimento foram reproduzidas antes de suas correções. O teste de unidade anterior de capacidade exigia a representação incorreta de chaves literais com ponto; foi corrigido e complementado por gravação/leitura real no emulador.

## Execução reproduzível

Com Node 24, Java 21 e dependências instaladas:

```bash
FIREBASE_PROJECT_ID=demo-nestlocal-integration npx --yes firebase-tools@15.26.0 emulators:exec --only firestore --project demo-nestlocal-integration --config firebase.emulators.json 'node scripts/integration-emulator.mjs'
```

O programa exige o projeto sintético exato, host loopback e ausência de `GOOGLE_APPLICATION_CREDENTIALS`. A API filha recebe uma lista explícita de variáveis, sem credenciais de transportes. As regras do emulador negam acesso de clientes; o Admin SDK é usado somente na infraestrutura de teste. A opção `--core-only` executa quatro cenários compatíveis com a correção isolada de produção, sem afirmar cobertura do financeiro novo.

O workflow `Firestore API integration` executa a suíte no GitHub Actions sem identidade de nuvem. A execução local utilizou o CLI 14 e emulador 1.19.8 por compatibilidade com o Java 17 instalado; a CI usa CLI 15.26 e Java 21. O resultado definitivo da CI deve ser conferido no SHA final.

## Limites e pendências reais

Esta evidência reduz a lacuna entre testes de domínio e integração, mas não certifica índices/custo do Firestore de produção, dados legados reais, login Google externo, pagamentos bancários, dispositivos físicos, backup restaurado ou entrega de mensagens. Nenhuma credencial ADC está disponível neste ambiente. Não houve leitura ou alteração de dados de clientes nesta homologação.

O PR #129 isola quatro correções do código já publicado: capacidade, acesso de membros, consentimento e referência indefinida no pedido público. A implantação ampla do PR #128 continua dependendo dos gates da matriz C01–C21. O contrato de produção do Connect foi relido e ainda declara `dispatch = not_implemented` e bloqueio de custo Meta; não se deve apresentar mensagem preparada como enviada.
