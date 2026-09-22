import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('no-show is an explicit lifecycle outcome that releases the reserved slot and can be rescheduled',()=>{
  const server=read('../server.mjs');
  for(const token of [
    "'no_show'",
    "scheduled:new Set(['in_progress','cancelled','no_show'])",
    "no_show:new Set(['scheduled','cancelled'])",
    "const scheduleSlotStatuses=new Set(['scheduled','in_progress'])",
  ]) assert.ok(server.includes(token),`missing ${token}`);
});

test('customer tracking cannot reopen quote decision after a no-show',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.get('/api/public/requests/:requestId'");
  const end=server.indexOf("app.post('/api/public/requests/:requestId/decision'",start);
  const getBlock=server.slice(start,end);
  assert.ok(getBlock.includes("'no_show'"));
  const decisionStart=end;
  const decisionEnd=server.indexOf("app.post('/api/public/requests/:requestId/schedule-confirmation'",decisionStart);
  const decisionBlock=server.slice(decisionStart,decisionEnd);
  assert.ok(decisionBlock.includes("'no_show'"));
});

test('UI can mark no-show and treats it as a reschedule priority',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "data-request-status=\"no_show\"",
    "t('markNoShow')",
    "r.status==='no_show'",
    "type:'reschedule',priority:95",
    "['accepted','scheduled','no_show']",
  ]) assert.ok(client.includes(token),`missing ${token}`);
});

test('pilot scoreboard reports recent factual funnel counts and values',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('function pilotScoreboard(){');
  const end=client.indexOf('function today(){',start);
  const block=client.slice(start,end);
  assert.ok(start>=0);
  for(const token of [
    'receivedMetric',
    'quotedMetric',
    'approvedMetric',
    'executedMetric',
    'noResponseMetric',
    'cancelledMetric',
    'noShowMetric',
    'quotedValueMetric',
    'approvedValueMetric',
    'executedValueMetric',
    "requests=S.data.requests||[]",
  ]) assert.ok(block.includes(token),`missing ${token}`);
  assert.ok(client.includes("t('recentPilotMetricsHelp')"));
});

test('pilot scoreboard is responsive',()=>{
  const css=read('../web/operations.css');
  for(const token of ['.pilot-scoreboard','.pilot-counts','.pilot-values','@media(max-width:900px)','@media(max-width:620px)']) assert.ok(css.includes(token),`missing ${token}`);
});
