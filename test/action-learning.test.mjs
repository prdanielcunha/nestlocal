import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { actionOutcomeSnapshot, updateActionMetric } from '../src/domain/action-learning.mjs';
import { buildOutcomeLearningModel, renderOutcomeLearning } from '../web/outcome-learning.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('daily learning metric records one explicit contact and its explainable cohorts',()=>{
  const metric=updateActionMetric({},{
    day:'2026-09-19',
    outcome:'no_response',
    channel:'whatsapp',
    actionType:'quote_followup',
    counted:false,
  });
  assert.equal(metric.total,1);
  assert.equal(metric.outcomes.no_response,1);
  assert.equal(metric.channels.whatsapp,1);
  assert.equal(metric.actionTypes.quote_followup,1);
  assert.equal(metric.channelOutcomes.whatsapp.total,1);
  assert.equal(metric.channelOutcomes.whatsapp.outcomes.no_response,1);
  assert.equal(metric.actionTypeOutcomes.quote_followup.total,1);
  assert.equal(metric.cohortSchemaVersion,1);
});

test('same-day outcome refinement changes global and cohort outcome buckets without duplicating contact',()=>{
  const initial={
    date:'2026-09-19',
    total:1,
    outcomes:{no_response:1},
    channels:{whatsapp:1},
    actionTypes:{quote_followup:1},
    channelOutcomes:{whatsapp:{total:1,outcomes:{no_response:1}}},
    actionTypeOutcomes:{quote_followup:{total:1,outcomes:{no_response:1}}},
  };
  const metric=updateActionMetric(initial,{
    day:'2026-09-19',
    outcome:'positive_signal',
    previousOutcome:'no_response',
    channel:'whatsapp',
    actionType:'quote_followup',
    counted:true,
    cohortCounted:true,
  });
  assert.equal(metric.total,1);
  assert.equal(metric.outcomes.no_response,0);
  assert.equal(metric.outcomes.positive_signal,1);
  assert.equal(metric.channels.whatsapp,1);
  assert.equal(metric.channelOutcomes.whatsapp.total,1);
  assert.equal(metric.channelOutcomes.whatsapp.outcomes.no_response,0);
  assert.equal(metric.channelOutcomes.whatsapp.outcomes.positive_signal,1);
  assert.equal(metric.actionTypeOutcomes.quote_followup.total,1);
});

test('legacy counted event can enter cohort matrix once without inflating historical totals',()=>{
  const metric=updateActionMetric({
    date:'2026-09-19',
    total:4,
    outcomes:{positive_signal:1,no_response:3},
    channels:{whatsapp:4},
    actionTypes:{quote_followup:4},
  },{
    day:'2026-09-19',
    outcome:'positive_signal',
    previousOutcome:'positive_signal',
    channel:'whatsapp',
    actionType:'quote_followup',
    counted:true,
    cohortCounted:false,
  });
  assert.equal(metric.total,4);
  assert.equal(metric.channels.whatsapp,4);
  assert.equal(metric.channelOutcomes.whatsapp.total,1);
  assert.equal(metric.channelOutcomes.whatsapp.outcomes.positive_signal,1);
});

test('30-day snapshot aggregates observed facts and cross-cohort coverage',()=>{
  const snapshot=actionOutcomeSnapshot([
    {
      total:2,
      outcomes:{no_response:1,positive_signal:1},
      channels:{whatsapp:2},
      actionTypes:{quote_followup:2},
      channelOutcomes:{whatsapp:{total:2,outcomes:{no_response:1,positive_signal:1}}},
      actionTypeOutcomes:{quote_followup:{total:2,outcomes:{no_response:1,positive_signal:1}}},
    },
    {
      total:3,
      outcomes:{asked_later:1,not_interested:1,unresolved:1},
      channels:{phone:2,email:1},
      actionTypes:{customer_reactivation:3},
      channelOutcomes:{
        phone:{total:2,outcomes:{asked_later:1,not_interested:1}},
        email:{total:1,outcomes:{unresolved:1}},
      },
      actionTypeOutcomes:{customer_reactivation:{total:3,outcomes:{asked_later:1,not_interested:1,unresolved:1}}},
    },
  ],{periodStart:'2026-08-21',periodEnd:'2026-09-19'});
  assert.equal(snapshot.total,5);
  assert.equal(snapshot.responseRecorded,3);
  assert.equal(snapshot.positiveSignals,1);
  assert.equal(snapshot.noResponses,1);
  assert.deepEqual(snapshot.channels,{whatsapp:2,phone:2,email:1,other:0});
  assert.deepEqual(snapshot.actionTypes,{quote_followup:2,customer_reactivation:3});
  assert.deepEqual(snapshot.channelDetails.whatsapp,{total:2,responseRecorded:1,positiveSignals:1,noResponses:1,askedLater:0,notInterested:0,unresolved:0});
  assert.equal(snapshot.channelDetails.phone.responseRecorded,2);
  assert.equal(snapshot.channelDetailedSample,5);
  assert.equal(snapshot.actionTypeDetailedSample,5);
  assert.equal(snapshot.daysWithData,2);
});

test('learning model keeps low-volume groups descriptive and suppresses their rates',()=>{
  const model=buildOutcomeLearningModel({
    total:7,responseRecorded:4,positiveSignals:2,noResponses:2,windowDays:30,
    channelDetailedSample:7,
    channelDetails:{
      whatsapp:{total:4,responseRecorded:3,positiveSignals:2,noResponses:1},
      phone:{total:3,responseRecorded:1,positiveSignals:0,noResponses:1},
    },
  });
  assert.equal(model.insightStage,'collecting');
  assert.equal(model.channelInsights.length,2);
  assert.equal(model.channelInsights.every(row=>row.eligible===false),true);
  assert.equal(model.minimumCohortSample,5);
  assert.equal(model.minimumDetailedSample,10);
});

test('learning model permits descriptive comparison only after minimum coverage in two channels',()=>{
  const model=buildOutcomeLearningModel({
    total:12,responseRecorded:7,positiveSignals:3,noResponses:4,windowDays:30,
    channelDetailedSample:12,
    channelDetails:{
      whatsapp:{total:6,responseRecorded:4,positiveSignals:2,noResponses:2},
      phone:{total:6,responseRecorded:3,positiveSignals:1,noResponses:2},
    },
    actionTypeDetails:{
      quote_followup:{total:7,responseRecorded:5,positiveSignals:2,noResponses:2},
      customer_reactivation:{total:5,responseRecorded:2,positiveSignals:1,noResponses:2},
    },
  });
  assert.equal(model.insightStage,'comparable');
  assert.equal(model.eligibleChannels,2);
  assert.equal(model.channelInsights[0].responseRate,67);
  assert.equal(model.channelInsights[1].responseRate,50);
  assert.equal(model.eligibleActions,2);
});

test('renderer never shows a rate for a cohort below five contacts',()=>{
  const labels={
    autopilotLearning:'Learning',autopilotLearningHelp:'Observed',days:'days',contactsRecorded:'Contacts',responsesRecorded:'Responses',positiveSignals:'Positive',noResponses:'No response',byChannel:'Channels',byAction:'Actions',channelPhone:'Phone',channelOther:'Other',action_followup:'Follow-up',action_reactivate:'Reactivate',learningGuardrail:'No causality',noLearningData:'No data',
    explainableInsights:'Explainable',insightCollecting:'Need {n}',insightNeedSecondChannel:'Need second {n}',insightComparable:'Comparable',insightStarting:'Starting',insightCoverage:'Detailed {n}',channelReading:'By channel',actionReading:'By action',minimumSample:'Minimum {n}',insightSample:'{n} contacts',insightSmallSample:'Small sample ({n})',insightResponses:'{responses}/{total} responses · {rate}%',insightPositive:'{n} positive',
  };
  const html=renderOutcomeLearning({
    snapshot:{total:4,responseRecorded:3,positiveSignals:2,noResponses:1,channels:{whatsapp:4},actionTypes:{quote_followup:4},channelDetailedSample:4,channelDetails:{whatsapp:{total:4,responseRecorded:3,positiveSignals:2,noResponses:1}},actionTypeDetails:{quote_followup:{total:4,responseRecorded:3,positiveSignals:2,noResponses:1}},periodStart:'2026-08-21',periodEnd:'2026-09-19'},
    t:key=>labels[key]||key,esc:value=>String(value),
  });
  assert.match(html,/Small sample \(4\)/);
  assert.equal(html.includes('75%'),false);
});

test('renderer shows factual rates after threshold without naming a winner or changing priority',()=>{
  const labels={
    autopilotLearning:'Learning',autopilotLearningHelp:'Observed',days:'days',contactsRecorded:'Contacts',responsesRecorded:'Responses',positiveSignals:'Positive',noResponses:'No response',byChannel:'Channels',byAction:'Actions',channelPhone:'Phone',channelOther:'Other',action_followup:'Follow-up',action_reactivate:'Reactivate',learningGuardrail:'No causality',noLearningData:'No data',
    explainableInsights:'Explainable',insightCollecting:'Need {n}',insightNeedSecondChannel:'Need second {n}',insightComparable:'Comparable base',insightStarting:'Starting',insightCoverage:'Detailed {n}',channelReading:'By channel',actionReading:'By action',minimumSample:'Minimum {n}',insightSample:'{n} contacts',insightSmallSample:'Small sample ({n})',insightResponses:'{responses}/{total} responses · {rate}%',insightPositive:'{n} positive',
  };
  const html=renderOutcomeLearning({
    snapshot:{
      total:12,responseRecorded:7,positiveSignals:3,noResponses:4,
      channels:{whatsapp:6,phone:6},actionTypes:{quote_followup:7,customer_reactivation:5},
      channelDetailedSample:12,
      channelDetails:{whatsapp:{total:6,responseRecorded:4,positiveSignals:2,noResponses:2},phone:{total:6,responseRecorded:3,positiveSignals:1,noResponses:2}},
      actionTypeDetails:{quote_followup:{total:7,responseRecorded:5,positiveSignals:2,noResponses:2},customer_reactivation:{total:5,responseRecorded:2,positiveSignals:1,noResponses:2}},
      periodStart:'2026-08-21',periodEnd:'2026-09-19',
    },
    t:key=>labels[key]||key,esc:value=>String(value),
  });
  assert.match(html,/4\/6 responses · 67%/);
  assert.match(html,/3\/6 responses · 50%/);
  assert.match(html,/Comparable base/);
  assert.equal(/best|winner|melhor/i.test(html),false);
});

test('empty learning state remains useful instead of fabricating activity',()=>{
  const labels={autopilotLearning:'Learning',autopilotLearningHelp:'Observed',days:'days',noLearningData:'No data yet',learningGuardrail:'No causality'};
  const html=renderOutcomeLearning({snapshot:{total:0,windowDays:30},t:key=>labels[key]||key,esc:value=>String(value)});
  assert.match(html,/No data yet/);
  assert.match(html,/30 days/);
});

test('server persists cohort coverage atomically and reads only rolling daily buckets',()=>{
  const server=read('../server.mjs');
  for(const token of [
    "from './src/domain/action-learning.mjs'",
    'nestlocal_action_metrics',
    "where('date','>=',actionMetricStart)",
    "orderBy('date').limit(31)",
    'metricsRecorded:true',
    'cohortMetricsRecorded:true',
    'cohortCounted=existingData?.cohortMetricsRecorded===true',
    'updateActionMetric(',
    'actionOutcomeSnapshot(',
  ]) assert.ok(server.includes(token),'missing '+token);
  const start=server.indexOf("app.get('/api/organizations/:orgId/nestlocal'");
  const end=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/team",start);
  const block=server.slice(start,end);
  assert.equal(block.includes('nestlocal_action_events'),false);
});

test('Home integrates explainable learning in PT EN ES and responsive styling',()=>{
  const client=read('../web/live.js'),css=read('../web/operations.css');
  for(const token of [
    "from './outcome-learning.js'",
    "autopilotLearning:'Aprendizado do Autopilot'",
    "autopilotLearning:'Autopilot learning'",
    "autopilotLearning:'Aprendizaje del Autopilot'",
    "explainableInsights:'Leitura explicável'",
    "explainableInsights:'Explainable reading'",
    "explainableInsights:'Lectura explicable'",
    'actionOutcomeMetrics',
    'outcomeLearningCard()',
  ]) assert.ok(client.includes(token),'missing '+token);
  for(const token of ['.outcome-learning','.learning-insights','.learning-insight-row','.learning-insight-status.comparable','@media(max-width:760px)']) assert.ok(css.includes(token),'missing '+token);
});
