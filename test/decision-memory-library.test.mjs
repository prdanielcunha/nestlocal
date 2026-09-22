import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decisionMemoryLibrary, experimentContextForAction, renderDecisionMemoryLibrary } from '../web/guided-experiment.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

const snapshot=(actionType='quote_followup',responseRate=60)=>({
  version:1,
  experimentId:'exp-source',
  status:'completed',
  actionType,
  targetPerVariant:5,
  sampleTotal:10,
  complete:true,
  comparable:true,
  variants:{
    whatsapp:{total:5,responses:3,positiveSignals:2,comparable:true,responseRate,positiveRate:40},
    phone:{total:5,responses:2,positiveSignals:1,comparable:true,responseRate:40,positiveRate:20},
  },
  responseSpreadPp:Math.abs(responseRate-40),
  positiveSpreadPp:20,
  limitations:['descriptive_only'],
});

const canonical=(overrides={})=>({
  id:'quote_followup',
  version:1,
  actionType:'quote_followup',
  decision:'context_only',
  note:'Contexto canônico',
  snapshot:snapshot(),
  sourceExperimentId:'exp-source',
  stale:false,
  ...overrides,
});

const fallbackReview={
  id:'exp-recent',
  status:'completed',
  actionType:'quote_followup',
  reviewStale:false,
  review:{decision:'context_only',note:'Fallback recente',snapshot:snapshot('quote_followup',80)},
};

test('canonical decision memory wins over a conflicting recent experiment fallback',()=>{
  const context=experimentContextForAction([fallbackReview],{type:'followup'},{quote_followup:canonical()});
  assert.equal(context.source,'decision_memory');
  assert.equal(context.id,'exp-source');
  assert.equal(context.note,'Contexto canônico');
  assert.equal(context.variants[0].responseRate,60);
});

test('canonical memory survives when the reviewed source experiment is no longer in recent history',()=>{
  const recent=Array.from({length:5},(_,i)=>({id:`new-${i}`,status:'completed',actionType:'customer_reactivation'}));
  const context=experimentContextForAction(recent,{type:'followup'},{quote_followup:canonical()});
  assert.equal(context?.source,'decision_memory');
  assert.equal(context?.sampleTotal,10);
});

test('stale canonical memory is authoritative and suppresses older fallback context',()=>{
  const context=experimentContextForAction([fallbackReview],{type:'followup'},{quote_followup:canonical({stale:true})});
  assert.equal(context,null);
});

test('stale canonical memory without valid fallback is not shown in Action Assistant',()=>{
  const context=experimentContextForAction([],{type:'followup'},{quote_followup:canonical({stale:true})});
  assert.equal(context,null);
});

test('same-type active experiment suppresses canonical and fallback context',()=>{
  const active={id:'active',status:'active',actionType:'quote_followup'};
  const context=experimentContextForAction([active,fallbackReview],{type:'followup'},{quote_followup:canonical()});
  assert.equal(context,null);
});

test('learning library exposes at most one memory per supported action type',()=>{
  const memory={
    quote_followup:canonical(),
    customer_reactivation:canonical({id:'customer_reactivation',actionType:'customer_reactivation',sourceExperimentId:'react-source',snapshot:snapshot('customer_reactivation',50)}),
    unsupported:canonical({actionType:'unsupported'}),
  };
  const rows=decisionMemoryLibrary(memory,[]);
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(x=>x.actionType),['quote_followup','customer_reactivation']);
  assert.ok(rows.every(x=>x.source==='decision_memory'));
});

test('learning library keeps stale canonical memory visible as a review-needed record',()=>{
  const rows=decisionMemoryLibrary({quote_followup:canonical({stale:true})},[]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].stale,true);
  assert.equal(rows[0].source,'decision_memory');
});

test('library renderer is descriptive and does not produce a channel recommendation',()=>{
  const labels={
    learningLibrary:'Learning library',
    learningLibraryTitle:'Long lived memory',
    learningLibraryHelp:'Human reviewed only',
    learningLibraryGuardrail:'Context not automation',
    memoryCanonical:'Canonical memory',
    memoryLegacyFallback:'Legacy',
    memoryStale:'Needs review',
    memorySample:'{n} reviewed contacts',
    memorySpread:'{n} pp observed spread',
    memoryDescriptiveOnly:'descriptive reading',
    memoryStored:'Available in assistant',
    memoryPendingCanonical:'Pending canonical',
    memoryUnavailable:'No sample',
    action_followup:'Follow-up',
    action_reactivate:'Reactivate',
  };
  const html=renderDecisionMemoryLibrary({decisionMemory:{quote_followup:canonical()},experiments:[],t:key=>labels[key]||key,esc:String});
  assert.match(html,/Learning library/);
  assert.match(html,/10 reviewed contacts/);
  assert.match(html,/20 pp observed spread/);
  assert.match(html,/Available in assistant/);
  assert.equal(/winner:|best channel|recommended channel|use whatsapp|use phone/i.test(html),false);
});

test('review endpoint atomically updates experiment and canonical memory',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/experiments/:experimentId/review'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/action-events'",start);
  const block=server.slice(start,end);
  for(const token of [
    'nestlocal_decision_memory',
    'sourceExperimentId:experimentId',
    'stale:false',
    'tx.set(memoryRef,memory,{merge:false})',
    'experimentReviewSnapshot(data)',
  ]) assert.ok(block.includes(token),'missing '+token);
});

test('outcome refinement only invalidates canonical memory when it still points to that experiment',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/action-events'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/messages/prepare'",start);
  const block=server.slice(start,end);
  for(const token of [
    'sourceExperimentId',
    "===expData.id",
    "staleReason:'source_outcome_changed'",
    'reviewChanged',
    'await tx.get(memoryRef)',
  ]) assert.ok(block.includes(token),'missing '+token);
});

test('authorized Home load reads canonical decision memory separately from recent experiments',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.get('/api/organizations/:orgId/nestlocal'");
  const end=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/team/:uid'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes("db.collection(`${root}/nestlocal_experiments`).orderBy('createdAt','desc').limit(5).get()"));
  assert.ok(block.includes("db.collection(`${root}/nestlocal_decision_memory`).limit(10).get()"));
  assert.ok(block.includes('decisionMemory:Object.fromEntries'));
});

test('canonical memory stays outside Next Best Action priority logic',()=>{
  const client=read('../web/live.js');
  const nextStart=client.indexOf('function nextBestActions()'),nextEnd=client.indexOf('function actionControls',nextStart);
  const block=client.slice(nextStart,nextEnd);
  assert.equal(block.includes('decisionMemory'),false);
  assert.equal(block.includes('learningLibrary'),false);
});

test('Learning Library UI is translated and responsive',()=>{
  const client=read('../web/live.js'),css=read('../web/operations.css'),ui=read('../web/guided-experiment.js');
  for(const token of [
    "learningLibrary:'Biblioteca de aprendizado'",
    "learningLibrary:'Learning library'",
    "learningLibrary:'Biblioteca de aprendizaje'",
    'decisionMemoryLibrary',
    'renderDecisionMemoryLibrary',
    'S.data.decisionMemory',
  ]) assert.ok(client.includes(token)||ui.includes(token),'missing '+token);
  for(const token of ['.decision-memory-library','.decision-memory-row','.decision-memory-guardrail']) assert.ok(css.includes(token),'missing '+token);
});
