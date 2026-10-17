# C08 — Pré-conciliação financeira em modo somente leitura

Este procedimento é parte do gate de homologação do NestLocal 2.0. **Não concilia pagamentos bancários nem executa estornos** e não altera Firestore, Stripe ou o Hub. Precisa de operador autenticado com credenciais ADC, projeto e organização explicitamente escolhidos.

## Objetivo

Identificar, sem alterar clientes, os pontos em que o histórico impede validar a diferença entre serviço executado, caixa declarado manualmente e receita assistida pela IA. O relatório agregado não inclui nomes, telefones, identificadores dos pedidos nem tokens.

### Execução em ambiente autorizado

```bash
FIREBASE_PROJECT_ID=PROJECT_ID node scripts/nestlocal-finance-preflight.mjs \
  --org ORG_ID_CONFIRMADO --max-requests 500
```

A opção `--max-requests` aceita 1–10000; o padrão é 500. A rotina lê páginas de até 100 e consulta eventos assistidos somente para pedidos concluídos atribuídos à IA. **É uma consulta ao Firestore e pode gerar custos de leitura.** Usar ambiente de homologação e conjunto pequeno inicialmente.

- Código de saída `0`: escopo completamente varrido e nenhum problema identificado pelas regras implementadas.
- Código `2`: discrepâncias detectadas; exige revisão por administrador, sem alteração automática.
- Código `3`: limite de varredura atingido; não se pode afirmar conciliação completa.

Um resultado `0` **não confirma recebimento bancário**: os valores pagos são declarações de operador, e o script verifica apenas integridade lógico-contábil dentro do NestLocal. Não utiliza credenciais Stripe nem extratos bancários.

## Categorias verificadas

- Conclusão legada sem marcador de reconhecimento e ausência de valor final confiável.
- Pagamento declarado incompatível com status `pending`, `partial`, `paid` ou `cancelled`.
- Recebimento manual maior que o valor final do serviço.
- Montante histórico não registrável com segurança.
- Serviço atribuído ao assistente sem evento de receita correspondente ou com valor diferente.
- Validação explícita de conjunto completo versus relatório limitado.

Ajustes existentes preservam revisão crescente e auditoria em `payment_events`. O novo relatório **não tenta recalcular** faturamento do cliente a partir do saldo de um único pedido, nem assumir que um evento do NestLocal prova liquidação bancária.

## Antes de liberar produção

1. Capturar estado e backup restaurável de todos os escopos impactados no ambiente GCP autorizado.
2. Rodar a varredura completa numa cópia isolada com dados migrados e comparar divergências em execução e pagamentos.
3. Exercitar: serviço concluído uma vez, atualização de preço, entrada parcial, mudança para pago, estorno manual, retry, dados sem marcadores e ações concorrentes.
4. Homologar os relatórios com a pessoa responsável pelas finanças e documentar a origem de cada ajuste legado.
5. Executar E2E autenticado entre perfis de atendimento, campo, financeiro e administrador; negar mudança de valores sem `financeWrite`.
6. Confirmar que nenhuma rotina altera dados Stripe ou aplicativos de outras organizações.

**Estado atual:** verificadores e testes sintéticos versionados, sem leitura do projeto real, sem restauração ensaiada e sem homologação financeira com credenciais válidas. C08 permanece **parcial**.
