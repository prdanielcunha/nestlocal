# Prospect Readiness — Radar 2026-09-22

## Objetivo

Tornar o NestLocal demonstrável e operável para a primeira onda comercial de Londrina, Cambé e região sem transformar o produto em um ERP pesado.

O critério de produto é simples: a empresa precisa conseguir entrar, configurar seu fluxo real e operar **pedido → orçamento → aprovação → agenda → execução → pagamento/status → retorno**, mantendo o WhatsApp como canal de relacionamento.

## Cobertura da primeira onda

| Perfil do prospect | Playbook | Cobertura operacional |
| --- | --- | --- |
| Valuz / PPA / portões e segurança | Portões e segurança | catálogo, fotos, marca/modelo, defeito, orçamento, técnico, agenda, execução, garantia e retorno |
| Lavarie / Limpeza de Sofá / Purify / Inova Wash / Kapazi | Limpeza especializada | item/tamanho, tecido/material, fotos, orçamento, follow-up, agenda e retorno |
| Help Casa | Pequenos reparos | categoria, urgência, orçamento, agenda, responsável, execução e retorno |
| Edy / Eletriczone / eletricistas | Elétrica e manutenção | ponto afetado, urgência, fotos, orçamento, agenda, execução e retorno |
| Vanco / Iclima / demais climatizadoras | Climatização | equipamento, marca/modelo, BTUs, fotos, orçamento, agenda, manutenção futura |
| Ecosafe / Defende / dedetizadoras | Controle de pragas | praga, imóvel, área, orçamento, agenda e recorrência |

## Diferenciais demonstráveis

### 1. O que fazer agora

A Home prioriza ações com base no estado real da operação: pedido para revisar, orçamento parado, serviço aprovado para agendar, atendimento para iniciar/finalizar, saldo a receber e cliente na hora de voltar.

### 2. Receita Assistida

Quando um orçamento parado ou um cliente reativado volta ao fluxo e o serviço é concluído, o NestLocal consegue atribuir o resultado à ação que ajudou a recuperar a oportunidade. Isso permite vender resultado operacional, não número de telas.

### 3. Intake por segmento

O formulário público muda conforme o serviço. Em vez de um formulário genérico:

- limpeza pergunta item/tamanho e tecido/material;
- climatização pergunta equipamento, marca/modelo e BTUs;
- pragas pergunta tipo de praga, imóvel e área;
- elétrica pergunta ponto afetado e urgência;
- portões pergunta marca/modelo, defeito ou perfil do portão.

As respostas são validadas no servidor e aparecem no pedido interno.

### 4. Entrada rápida de carteira

A tela Clientes aceita colagem de até 100 linhas de Google Sheets/Excel por lote. O importador cria ou atualiza clientes pelo WhatsApp e aceita último serviço, última data, próximo retorno e motivo.

A importação **não** cria consentimento de WhatsApp. Clientes importados podem entrar na fila de retorno, mas mensagens oficiais continuam exigindo consentimento compatível.

### 5. Garantia, evidência e pós-serviço

Ao concluir um atendimento, o operador pode registrar próxima data de serviço e garantia. A operação também pode anexar evidências privadas de antes/depois, imprimir uma OS e gerar um link seguro de avaliação do cliente.

### 6. Plano de manutenção e campo

Clientes recorrentes podem ter plano de manutenção com frequência, próxima visita e datas de contrato. Agenda e pedidos oferecem rota pelo endereço armazenado, sem fingir otimização automática de deslocamento.

### 7. Portal seguro do cliente

O mesmo acompanhamento seguro cobre orçamento, agenda, confirmação/solicitação de mudança, saldo registrado, garantia e próximo retorno. Se a empresa optar, pode exibir uma chave Pix quando houver saldo, sem afirmar baixa automática.

### 8. Campanha Dossiê 42

O Radar comercial possui uma importação única dos 42 prospects pesquisados em 22/09/2026. O score do dossiê é armazenado como **referência de fit**, separado do Fit Score calculado pelo produto e do Pain Score observado.

Pain Score permanece zerado até existir conversa real.

## O que já está pronto para piloto

- login e autorização multi-tenant;
- onboarding real por segmento;
- catálogo publicável;
- página pública da empresa;
- orçamento determinístico ou manual;
- fotos;
- aprovação/recusa do orçamento pelo cliente;
- agenda com responsável e trava de conflito;
- execução;
- valor final, pagamento pendente/parcial/pago;
- clientes e histórico operacional;
- retorno por regra de serviço ou data manual;
- fila de reativação;
- acompanhamento de follow-up;
- Receita Assistida;
- Radar comercial e Pain Score;
- importação de prospects;
- campanha pronta para importar os 42 prospects do dossiê;
- importação rápida de clientes;
- evidências de campo antes/depois;
- OS imprimível;
- avaliações seguras e média factual;
- planos de manutenção leves;
- rota por endereço;
- confirmação/alteração de agenda pelo cliente;
- portal seguro com saldo, garantia e retorno;
- Pix opcional como instrução de pagamento, com baixa manual;
- PT/EN/ES;
- garantia opcional.

## Gaps que não devem ser vendidos como prontos

### Envio automático por WhatsApp

O NestLocal já possui consentimento, templates, readiness e outbox, mas o disparo oficial depende da conexão do provedor/Connect, política de custo, worker de dispatch e webhooks de entrega. Até isso existir, o contato é assistido/manual.

### PMOC e contratos formais

A recorrência de manutenção está pronta, mas PMOC completo, contratos documentais, laudos e gestão regulatória não são um módulo vertical completo. Para climatizadoras que já usam um software forte, a estratégia é complementar o ciclo de receita e operação, não prometer substituição imediata do stack técnico.

### Cobrança do serviço dentro do NestLocal

O app registra situação, valor pago e saldo. A empresa pode expor uma chave Pix no acompanhamento seguro, mas não há criação de cobrança, conciliação bancária ou baixa automática. O pagamento do serviço continua externo até existir integração específica. A assinatura do SaaS continua centralizada no MillionsNest.

### Rotas otimizadas

A agenda distribui trabalho por responsável, evita conflito de janela e oferece abertura de rota pelo endereço. Ainda não há roteirização geográfica/otimização automática de múltiplas paradas.

## Critério de demo

Toda demo deve usar dados próximos aos do prospect:

1. um cliente;
2. três serviços reais;
3. uma foto ou informação técnica típica;
4. um orçamento;
5. uma aprovação;
6. um agendamento com responsável;
7. uma conclusão;
8. um retorno futuro;
9. quando fizer sentido, uma garantia;
10. evidência antes/depois e OS;
11. confirmação do horário pelo cliente;
12. avaliação e retorno futuro.

A demo deve terminar na Home, mostrando a próxima ação e como o sistema impede que a oportunidade suma.

## Critério de piloto

O piloto deve começar com um único resultado mensurável por 7–14 dias:

- orçamento sem resposta recuperado;
- cliente antigo reativado;
- agenda organizada;
- retorno de manutenção criado;
- tempo administrativo poupado.

Não tentar migrar toda a empresa no primeiro dia.

## Métricas mínimas

Medir desde o primeiro piloto:

- leads por canal;
- orçamentos criados, enviados, aprovados, recusados e parados;
- tempo até follow-up;
- valor orçado, aprovado e executado;
- serviços agendados/concluídos;
- cancelamentos e no-shows;
- placar recente de recebidos, orçados, aprovados, executados, sem resposta, cancelados e no-shows;
- valores orçados, aprovados e executados na janela operacional carregada;
- saldo pendente;
- clientes com retorno;
- clientes reativados;
- Receita Assistida;
- tempo administrativo poupado, quando informado pelo cliente.

## Readiness comercial

**Pequenas e médias operações do radar:** piloto operacional pronto após validação do deploy.

**Empresas com stack vertical maduro:** prontas para qualificação e piloto complementar; não tratar como substituição total até validar PMOC/contratos/integrações exigidos por cada empresa.

O objetivo comercial não é prometer que todo prospect trocará de sistema. É provar que o NestLocal captura o espaço que normalmente fica entre WhatsApp, orçamento, agenda e retorno — e transformar esse espaço em receita e ação visível.
