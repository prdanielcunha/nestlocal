import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { actionOutcomeSnapshot, updateActionMetric } from '../src/domain/action-learning.mjs';
import { buildOutcomeLearningModel, renderOutcomeLearning } from '../web/outcome-learning.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('daily learning metric records one explicit contact without inventing outcomes',()=>{
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
});

test('same-day outcome refinement changes only the outcome bucket',()=>{
  const initial={
    date:'2026-09-19',
    total:1,
    outcomes:{no_response:1},
    channels:{whatsapp:1},
    actionTypes:{quote_followup:1},
  };
  const metric=updateActionMetric(initial,{
    day:'2026-09-19',
    outcome:'positive_signal',
    previousOutcome:'no_response',
    channel:'whatsapp',
    actionType:'quote_followup',
    counted:true,
  });
  assert.equal(metric.total,1);
  assert.equal(metric.outcomes.no_response,0);
  assert.equal(metric.outcomes.positive_signal,1);
  assert.equal(metric.channels.whatsapp,1);
  assert.equal(metric.actionTypes.quote_followup,1);
});

test('30-day snapshot aggregates observed facts only',()=>{
  const snapshot=actionOutcomeSnapshot([
    {total:2,outcomes:{no_response:1,positive_signal:1},channels:{whatsapp:2},actionTypes:{quote_followup:2}},
    {total:3,outcomes:{asked_later:1,not_interested:1,unresolved:1},channels:{phone:2,email:1},actionTypes:{customer_reactivation:3}},
  ],{periodStart:'2026-08-21',periodEnd:'2026-09-19'});
  assert.equal(snapshot.total,5);
  assert.equal(snapshot.responseRecorded,3);
  assert.equal(snapshot.positiveSignals,1);
  assert.equal(snapshot.noResponses,1);
  assert.deepEqual(snapshot.channels,{whatsapp:2,phone:2,email:1,other:0});
  assert.deepEqual(snapshot.actionTypes,{quote_followup:2,customer_reactivation:3});
  assert.equal(snapshot.daysWithData,2);
});

test('learning model never turns counts into speculative rates',()=>{
  const model=buildOutcomeLearningModel({total:4,responseRecorded:9,positiveSignals:2,noResponses:1,windowDays:30});
  assert.equal(model.total,4);
  assert.equal(model.responseRecorded,4);
  assert.equal(model.positiveSignals,2);
  assert.equal(model.noResponses,1);
  assert.equal('conversionRate' in model,false);
  assert.equal('successRate' in model,false);
});

test('learning renderer shows factual counts and an explicit guardrail',()=>{
  const labels={autopilotLearning:'Learning',autopilotLearningHelp:'Observed',days:'days',contactsRecorded:'Contacts',responsesRecorded:'Responses',positiveSignals:'Positive',noResponses:'No response',byChannel:'Channels',byAction:'Actions',channelPhone:'Phone',channelOther:'Other',action_followup:'Follow-up',action_reactivate:'Reactivate',learningGuardrail:'No causality',noLearningData:'No data'};
  const html=renderOutcomeLearning({
    snapshot:{total:3,responseRecorded:2,positiveSignals:1,noResponses:1,channels:{whatsapp:2,phone:1},actionTypes:{quote_followup:2,customer_reactivation:1},periodStart:'2026-08-21',periodEnd:'2026-09-19'},
    t:key=>labels[key]||key,
    esc:value=>String(value),
  });
  assert.match(html,/Contacts/);
  assert.match(html,/Positive/);
  assert.match(html,/WhatsApp/);
  assert.match(html,/No causality/);
  assert.equal(html.includes('%'),false);
});

test('empty learning state remains useful instead of fabricating activity',()=>{
  const labels={autopilotLearning:'Learning',autopilotLearningHelp:'Observed',days:'days',noLearningData:'No data yet',learningGuardrail:'No causality'};
  const html=renderOutcomeLearning({snapshot:{total:0,windowDays:30},t:key=>labels[key]||key,esc:value=>String(value)});
  assert.match(html,/No data yet/);
  assert.match(html,/30 days/);
});

test('server persists compact daily metrics and reads only the rolling daily buckets',()=>{
  const server=read('../server.mjs');
  for(const token of [
    "from './src/domain/action-learning.mjs'",
    'nestlocal_action_metrics',
    "where('date','>=',actionMetricStart)",
    "orderBy('date').limit(31)",
    'metricsRecorded:true',
    'updateActionMetric(',
    'actionOutcomeSnapshot(',
  ]) assert.ok(server.includes(token),'missing '+token);
  const start=server.indexOf("app.get('/api/organizations/:orgId/nestlocal'");
  const end=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/team",start);
  const block=server.slice(start,end);
  assert.equal(block.includes('nestlocal_action_events'),false);
});

test('Home integrates Autopilot learning in PT EN ES and responsive styling',()=>{
  const client=read('../web/live.js'),css=read('../web/operations.css');
  for(const token of [
    "from './outcome-learning.js'",
    "autopilotLearning:'Aprendizado do Autopilot'",
    "autopilotLearning:'Autopilot learning'",
    "autopilotLearning:'Aprendizaje del Autopilot'",
    'actionOutcomeMetrics',
    'outcomeLearningCard()',
  ]) assert.ok(client.includes(token),'missing '+token);
  for(const token of ['.outcome-learning','.learning-metrics','.learning-breakdowns','@media(max-width:760px)']) assert.ok(css.includes(token),'missing '+token);
});
