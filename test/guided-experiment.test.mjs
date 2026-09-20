import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canCountNewExperimentSample, guidedExperimentEligibility, normalizeExperiment, updateExperimentProgress } from '../src/domain/guided-experiment.mjs';
import { experimentForAction, guidedExperimentState, renderGuidedExperiment } from '../web/guided-experiment.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('guided experiment unlocks only with comparable channel and action samples',()=>{
  const snapshot={
    channelDetailedSample:10,
    channelDetails:{whatsapp:{total:5},phone:{total:5}},
    actionTypeDetails:{quote_followup:{total:5},customer_reactivation:{total:4}},
  };
  assert.equal(guidedExperimentEligibility(snapshot,'quote_followup').eligible,true);
  const blocked=guidedExperimentEligibility(snapshot,'customer_reactivation');
  assert.equal(blocked.eligible,false);
  assert.equal(blocked.missingAction,1);
  assert.equal(guidedExperimentEligibility({...snapshot,channelDetailedSample:9},'quote_followup').eligible,false);
  assert.equal(guidedExperimentEligibility({...snapshot,channelDetails:{whatsapp:{total:4},phone:{total:6}}},'quote_followup').eligible,false);
});

test('experiment progress counts explicit outcomes and balances the next variant',()=>{
  const base={id:'exp1',status:'active',dimension:'channel',actionType:'quote_followup',variants:['whatsapp','phone'],targetPerVariant:5,progress:{}};
  const first=updateExperimentProgress(base,{variant:'whatsapp',outcome:'positive_signal',counted:false});
  assert.equal(first.progress.whatsapp.total,1);
  assert.equal(first.progress.whatsapp.outcomes.positive_signal,1);
  assert.equal(first.progress.phone.total,0);
  assert.equal(first.nextVariant,'phone');
  const second=updateExperimentProgress(first,{variant:'phone',outcome:'no_response',counted:false});
  assert.equal(second.progress.phone.total,1);
  assert.equal(second.nextVariant,'whatsapp');
});

test('outcome refinement changes the same experimental sample without inflating total',()=>{
  const base=updateExperimentProgress({id:'exp1',status:'active',variants:['whatsapp','phone'],targetPerVariant:5,progress:{}},{variant:'whatsapp',outcome:'no_response',counted:false});
  const refined=updateExperimentProgress(base,{variant:'whatsapp',outcome:'positive_signal',previousOutcome:'no_response',counted:true});
  assert.equal(refined.progress.whatsapp.total,1);
  assert.equal(refined.progress.whatsapp.outcomes.no_response,0);
  assert.equal(refined.progress.whatsapp.outcomes.positive_signal,1);
});

test('full variant stops accepting new samples but keeps refinement possible',()=>{
  let experiment={id:'exp1',status:'active',variants:['whatsapp','phone'],targetPerVariant:5,progress:{whatsapp:{total:5,outcomes:{positive_signal:5}},phone:{total:4,outcomes:{positive_signal:4}}}};
  assert.equal(canCountNewExperimentSample(experiment,'whatsapp'),false);
  assert.equal(canCountNewExperimentSample(experiment,'phone'),true);
  experiment=updateExperimentProgress(experiment,{variant:'whatsapp',outcome:'no_response',counted:false});
  assert.equal(experiment.progress.whatsapp.total,5);
});

test('experiment completes only when both variants hit their explicit target',()=>{
  const normalized=normalizeExperiment({id:'exp1',status:'active',variants:['whatsapp','phone'],targetPerVariant:5,progress:{whatsapp:{total:5,outcomes:{}},phone:{total:5,outcomes:{}}}});
  assert.equal(normalized.complete,true);
  assert.equal(normalized.total,10);
  assert.equal(normalized.nextVariant,'');
});

test('Home only offers start when manager and sample gates are both satisfied',()=>{
  const snapshot={channelDetailedSample:12,channelDetails:{whatsapp:{total:6},phone:{total:6}},actionTypeDetails:{quote_followup:{total:7},customer_reactivation:{total:5}}};
  const manager=guidedExperimentState([],snapshot,true);
  assert.equal(manager.canStart,true);
  assert.deepEqual(manager.eligibleActions,['quote_followup','customer_reactivation']);
  assert.equal(guidedExperimentState([],snapshot,false).canStart,false);
});

test('Action Assistant enrolls only contacts with both real channels available',()=>{
  const experiments=[{id:'exp1',status:'active',actionType:'quote_followup',variants:['whatsapp','phone'],targetPerVariant:5,progress:{whatsapp:{total:2,outcomes:{}},phone:{total:1,outcomes:{}}}}];
  const eligible=experimentForAction(experiments,{type:'followup',phone:'5511999999999',whatsappAllowed:true});
  assert.equal(eligible.eligible,true);
  assert.equal(eligible.suggestedVariant,'phone');
  assert.equal(experimentForAction(experiments,{type:'followup',phone:'5511999999999',whatsappAllowed:false}).eligible,false);
  assert.equal(experimentForAction(experiments,{type:'reactivate',phone:'5511999999999',whatsappAllowed:true}).eligible,false);
});

test('renderer exposes progress and explicit no-winner guardrail',()=>{
  const labels={
    guidedExperiment:'Experiment',guidedExperimentTitle:'Small test',guidedExperimentReady:'Ready',guidedExperimentProposal:'Compare channels',guidedExperimentActive:'Active',guidedExperimentGuardrail:'No automatic winner',experimentStartHelp:'Both available',experimentAction:'Action',experimentTarget:'Target',startExperiment:'Start',stopExperiment:'Stop',experimentGoal:'Goal {n}',experimentContacts:'{n}/{target} contacts',experimentResponses:'{n} responses',experimentNextVariant:'Next',experimentNextHelp:'Balance only',experimentManagerOnly:'Manager only',experimentNeedsData:'Need {w} {p}',experimentCollecting:'Collecting',experimentCompleted:'Completed',experimentStopped:'Stopped',experimentHistoryGuardrail:'No winning channel',action_followup:'Follow-up',action_reactivate:'Reactivate',channelPhone:'Phone',insightPositive:'{n} positive',
  };
  const html=renderGuidedExperiment({
    experiments:[{id:'exp1',status:'active',actionType:'quote_followup',variants:['whatsapp','phone'],targetPerVariant:5,progress:{whatsapp:{total:2,outcomes:{positive_signal:1}},phone:{total:1,outcomes:{no_response:1}}}}],
    snapshot:{channelDetailedSample:12,channelDetails:{whatsapp:{total:6},phone:{total:6}},actionTypeDetails:{quote_followup:{total:7}}},
    canManage:true,t:key=>labels[key]||key,esc:String,
  });
  assert.match(html,/2\/5 contacts/);
  assert.match(html,/1\/5 contacts/);
  assert.match(html,/No automatic winner/);
  assert.equal(/best channel|winner:/i.test(html),false);
});

test('backend lifecycle is owner-admin controlled and baseline-gated',()=>{
  const server=read('../server.mjs');
  for(const token of [
    "canManageNestLocal(req.access)",
    "app.post('/api/organizations/:orgId/nestlocal/experiments'",
    "'EXPERIMENT_SAMPLE_NOT_READY'",
    "guidedExperimentEligibility(snapshot,actionType)",
    "activeExperimentId",
    "'ACTIVE_EXPERIMENT_EXISTS'",
    "app.post('/api/organizations/:orgId/nestlocal/experiments/:experimentId/stop'",
  ]) assert.ok(server.includes(token),'missing '+token);
});

test('backend prevents biased or duplicate experiment samples while preserving normal action events',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/action-events'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/messages/prepare'",start);
  const block=server.slice(start,end);
  for(const token of [
    'experimentTargetEligible=Boolean(targetPhone)&&whatsappEligible',
    'nestlocal_experiment_samples',
    "experimentReason='EXPERIMENT_TARGET_NOT_ELIGIBLE'",
    "experimentReason='EXPERIMENT_TARGET_ALREADY_USED'",
    "experimentReason='EXPERIMENT_VARIANT_FULL'",
    'experimentRecorded:true',
    'updateExperimentProgress(',
    "activeExperimentId:''",
  ]) assert.ok(block.includes(token),'missing '+token);
  assert.ok(block.includes("tx.create(eventRef,event)"));
});

test('guided experiment UI is translated and wired without changing action priority',()=>{
  const client=read('../web/live.js'),css=read('../web/operations.css');
  for(const token of [
    "from './guided-experiment.js'",
    "guidedExperiment:'Experimento guiado'",
    "guidedExperiment:'Guided experiment'",
    "guidedExperiment:'Experimento guiado'",
    'data-start-experiment',
    'data-stop-experiment',
    'data-experiment-id',
    'experimentForAction(',
  ]) assert.ok(client.includes(token),'missing '+token);
  for(const token of ['.guided-experiment','.experiment-progress','.assist-experiment','.experiment-start']) assert.ok(css.includes(token),'missing '+token);
  const nextStart=client.indexOf('function nextBestActions()'),nextEnd=client.indexOf('function actionControls',nextStart);
  assert.equal(client.slice(nextStart,nextEnd).includes('guidedExperiment'),false);
});
