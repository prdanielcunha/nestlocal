# NestLocal Growth Engine

## Objetivo

Transformar aquisição comercial em um fluxo mensurável e repetível sem transformar o NestLocal em uma agência.

O Growth Engine possui dois componentes:

1. **Raio-X de Receita Perdida** — ferramenta pública de diagnóstico e geração de leads.
2. **Radar comercial** — área interna, disponível apenas para papéis administrativos globais do ecossistema.

## Raio-X público

Rota: `/raio-x` (alias: `/diagnostico`).

O formulário coleta somente dados fornecidos voluntariamente pela empresa:

- empresa, responsável, cidade, segmento e WhatsApp;
- quantidade aproximada de orçamentos por mês;
- ticket médio;
- percentual aproximado que recebe follow-up;
- participação do WhatsApp na entrada de pedidos;
- tamanho da equipe;
- necessidade de agenda;
- recorrência do serviço;
- sinal de operação manual.

O resultado **não é uma previsão de receita**.

A oportunidade indicativa é calculada de forma determinística:

```
orçamentos sem acompanhamento
× 15% de hipótese de recuperação
× ticket médio informado
```

A hipótese de 15% fica explícita no resultado. Nenhum modelo de IA inventa receita, conversão, ticket ou demanda.

O envio exige consentimento. O lead fica em `nestlocal_growth_leads` com origem `revenue_xray`.

## Fit Score

Para leads manuais, o Radar usa a mesma lógica validada na prospecção inicial:

| Sinal | Peso |
| --- | ---: |
| Orçamento faz parte da venda | 20 |
| WhatsApp é canal forte | 20 |
| Precisa agendar serviço/equipe | 15 |
| Há recorrência | 15 |
| Sinais de demanda | 10 |
| Equipe pequena | 10 |
| Dono envolvido | 5 |
| Sem sistema forte aparente | 5 |

Cada sinal aceita 0, 0,5 ou 1.

O score é um filtro operacional, não uma garantia de compra.

## Pain Score

Após a primeira conversa, a dor real é qualificada com:

| Sinal | Peso |
| --- | ---: |
| Orçamentos se perdem | 25 |
| Sem follow-up formal | 20 |
| Sem reativação automática | 15 |
| Agenda desorganizada | 15 |
| Volume suficiente | 10 |
| Dono sente a dor | 5 |
| Urgência em resolver | 10 |

Referência de uso:

- 70–100: quente;
- 45–69: morno;
- abaixo de 45: baixa prioridade.

O sistema não toma a decisão comercial sozinho. O score serve para ordenar atenção.

## Segurança e privacidade

- APIs do Radar exigem autenticação Firebase e papel administrativo global.
- Leads do Raio-X não são expostos por endpoints públicos.
- O Raio-X tem rate limit independente.
- Nenhuma mensagem de WhatsApp é enviada automaticamente.
- O contato deve respeitar consentimento e as políticas do canal.
- Dados operacionais informados no Raio-X são tratados como declarações do próprio lead, não fatos verificados.

## Próximos passos seguros

1. Medir conclusão do Raio-X.
2. Medir taxa de resposta dos leads do Radar.
3. Medir diagnóstico → demo → trial → cliente.
4. Ajustar pesos somente com dados reais.
5. Integrar uma fonte oficial de prospecção/enriquecimento apenas depois que o processo manual estiver validado.
6. Habilitar mensagens apenas com canal oficial, opt-in e governança.


## Funil e atribuição

O Radar registra a progressão comercial sem perder histórico.

Etapas mensuradas:

1. novo;
2. contatado;
3. respondeu;
4. diagnóstico;
5. demo;
6. trial;
7. cliente.

Cada mudança de estágio adiciona um evento em `stageHistory` e preserva `highestStage`. Assim, mover um lead para follow-up ou para outro estado operacional não apaga o fato de que ele já chegou a uma etapa anterior.

As métricas exibem:

- taxa de contato;
- taxa de resposta;
- resposta → diagnóstico;
- diagnóstico → demo;
- demo → trial;
- trial → cliente;
- lead → cliente.

### Atribuição de aquisição

Leads podem registrar:

- canal: Raio-X, Instagram, ligação, e-mail, indicação, parceiro, orgânico ou outro;
- argumento: receita invisível, orçamento sem follow-up, reativação, horário ocioso, caos no WhatsApp, indicação ou outro;
- campanha livre.

O objetivo é aprender com dados reais quais abordagens geram avanço no funil. O Radar mostra volume e conversão por argumento, sem declarar causalidade quando a amostra ainda é pequena.

O Raio-X entra automaticamente com canal `xray`, argumento `revenue_visibility` e campanha `revenue_xray`.


## Importação em lote e deduplicação

O Radar aceita até 50 prospects por lote.

A interface permite colar diretamente uma tabela do Google Sheets. Quando identifica a estrutura da planilha inicial do projeto (Empresa, Cidade, Segmento, Telefone, sinais do score etc.), ela converte automaticamente as colunas para o modelo do Radar.

A API:

- valida cada linha separadamente;
- ignora linhas inválidas sem derrubar todo o lote;
- elimina repetidos dentro do próprio lote;
- consulta repetidos já existentes;
- retorna quantos foram criados e quais índices foram ignorados.

A deduplicação inicial usa uma impressão digital de **nome normalizado da empresa + cidade**. Telefone não participa da identidade porque um mesmo negócio pode trocar ou divulgar números diferentes.

Essa identidade é uma heurística de aquisição, não um identificador legal. Quando o enriquecimento oficial com CNPJ/Place ID for habilitado, esses identificadores devem ter precedência para reconciliar entidades.


## Radar conectado ao Google Sheets

A fonte canônica de prospecção pode ser o documento **NestLocal — Radar de Prospects**. O NestLocal lê somente a aba `Leads` e mantém duas camadas separadas:

- **inteligência do Radar** em `lead.radar`: evidências públicas, site, telefone publicado, CNPJ/Place ID quando disponíveis, score, classe, hipótese de dor, abordagem sugerida, fonte e data de verificação;
- **estado comercial** no lead: estágio, histórico, Pain Score confirmado, contato, follow-up, diagnóstico, demo, trial e cliente.

Uma sincronização nunca deve apagar ou sobrescrever o histórico comercial. Um prospect removido do Sheet recebe `radar.sourcePresent=false`; o lead permanece no banco.

### Segurança da fonte

A sincronização:

- continua restrita aos mesmos papéis administrativos globais;
- usa Application Default Credentials no backend;
- acessa o Sheet diretamente pela Google Sheets API;
- requer apenas acesso **reader** para a conta de serviço do runtime;
- não torna a planilha pública;
- usa `NESTLOCAL_RADAR_SHEET_ID` e `NESTLOCAL_RADAR_SHEET_RANGE` como overrides opcionais, mantendo o Radar oficial como padrão.

### Reconciliação e identidade

A reconciliação prefere, quando presentes:

1. Google Place ID;
2. CNPJ;
3. telefone normalizado;
4. domínio do site;
5. nome normalizado + cidade.

A impressão digital legada de nome + cidade é preservada para reconciliar leads antigos sem duplicá-los.

### Radar Delta

Cada sync registra:

- quantidade encontrada na fonte;
- novos prospects;
- prospects atualizados;
- prospects sem mudança;
- prospects que deixaram de aparecer na fonte;
- revisão e horário da última sincronização.

### Attack Score

O **Attack Score** serve apenas para ordenar atenção. Ele não afirma intenção de compra e não transforma hipótese pública em dor confirmada.

Pesos iniciais:

| Componente | Peso |
| --- | ---: |
| Fit Score | 35% |
| Pain Score confirmado ou proxy explícito de hipótese | 25% |
| Momento/follow-up | 15% |
| Qualidade dos dados | 10% |
| Recência da verificação | 5% |
| Aprendizado real do segmento | 10% |

Antes da qualificação, a dor recebe apenas um proxy conservador se o Radar trouxer uma hipótese explícita. Depois que alguém salva a qualificação de dor, `painQualifiedAt` passa a distinguir Pain Score real de hipótese.

O aprendizado por segmento começa neutro e só muda com resultados reais observados no funil. Isso evita que amostras pequenas sejam tratadas como causalidade.


## Fila operacional e feedback de aprendizado

A fila **Quem atacar agora** é operacional, não apenas analítica.

Cada item pode trazer:

- mensagem inicial personalizada pelo ângulo recomendado, sem afirmar como fato uma dor ainda não confirmada;
- explicação dos sinais que colocaram a empresa na fila;
- tendência de prioridade em relação à baseline da última sincronização;
- abertura do WhatsApp com a mensagem pré-preenchida;
- registro de tentativa de contato no Firestore em um clique;
- contagem e horário do último contato;
- follow-up automático de dois dias após a tentativa registrada.

Abrir o WhatsApp registra somente uma **tentativa de contato**. Não registra resposta, demo ou cliente. Esses estágios continuam dependendo de atualização comercial explícita e alimentam o funil real.

### Tendência de prioridade

Na sincronização do Radar, o NestLocal salva uma baseline do Attack Score. Entre sincronizações, mudanças de estado comercial podem fazer o prospect subir ou cair. A interface mostra essa direção sem confundir score atual com probabilidade de compra.

### Feedback para a próxima rodada do Radar

O Radar de Prospects original permanece somente leitura para o runtime.

O aprendizado real é publicado em uma segunda planilha:

**NestLocal — Growth Learning Feedback**

Essa planilha recebe agregados do funil, desempenho por segmento e desempenho por ângulo. Ela é separada da fonte de prospects para que o app possa publicar aprendizado sem ter permissão para alterar a lista canônica de empresas.

O backend usa:

- `NESTLOCAL_RADAR_FEEDBACK_SHEET_ID` como override opcional;
- `NESTLOCAL_RADAR_FEEDBACK_SHEET_RANGE` como override opcional;
- Application Default Credentials da mesma conta de serviço do runtime.

Falhas na publicação do feedback não bloqueiam contato, qualificação ou sincronização do Radar; o erro é registrado e mostrado na interface administrativa.
