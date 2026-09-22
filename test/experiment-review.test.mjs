import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { experimentReviewSnapshot } from '../src/domain/guided-experiment.mjs';
import { buildExperimentReviewModel, renderGuidedExperiment } from '../web/guided-experiment.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

const completed={
  id:'exp-review',
  status:'completed',
  actionType:'quote_followup',
  variants:['whatsapp','phone'],
  targetPerVariant:5,
  progress:{
    whatsapp:{total:5,outcomes:{positive_signal:2,asked_later:1,no_response:2}},
    phone:{total:5,outcomes:{positive_signal:1,not_interested:1,no_response:3}},
  },
};

test('domain review snapshot exposes factual rates and absolute spreads',()=>{
  const review=experimentReviewSnapshot(completed);
  assert.equal(review.comparable,true);
  assert.equal(review.complete,true);
  assert.equal(review.sampleTotal,10);
  assert.equal(review.variants.whatsapp.responseRate,60);
  assert.equal(review.variants.phone.responseRate,40);
  assert.equal(review.variants.whatsapp.positiveRate,40);
  assert.equal(review.variants.phone.positiveRate,20);
  assert.equal(review.responseSpreadPp,20);
  assert.equal(review.positiveSpreadPp,20);
  assert.deepEqual(review.limitations,['descriptive_only']);
});

test('stopped experiment with small variant sample hides rates and records limitations',()=>{
  const review=experimentReviewSnapshot({...completed,status:'stopped',progress:{whatsapp:{total:3,outcomes:{positive_signal:2,no_response:1}},phone:{total:2,outcomes:{positive_signal:1,no_response:1}}}});
  assert.equal(review.comparable,false);
  assert.equal(review.complete,false);
  assert.equal(review.variants.whatsapp.responseRate,null);
  assert.equal(review.variants.phone.positiveRate,null);
  assert.equal(review.responseSpreadPp,null);
  assert.ok(review.limitations.includes('target_incomplete'));
  assert.ok(review.limitations.includes('small_variant_sample'));
  assert.ok(review.limitations.includes('descriptive_only'));
});

test('client review model marks saved and stale human decisions without inventing a winner',()=>{
  const model=buildExperimentReviewModel({...completed,review:{decision:'context_only',note:'Observe again later'},reviewStale:true});
  assert.equal(model.reviewed,true);
  assert.equal(model.stale,true);
  assert.equal(model.responseSpreadPp,20);
  assert.equal('winner' in model,false);
  assert.equal('bestVariant' in model,false);
});

test('review renderer shows rates, spread and context action with descriptive guardrail',()=>{
  const labels={
    guidedExperiment:'Experiment',guidedExperimentTitle:'Small test',guidedExperimentReady:'Ready',guidedExperimentProposal:'Compare',guidedExperimentActive:'Active',guidedExperimentGuardrail:'No auto winner',experimentStartHelp:'Both',experimentAction:'Action',experimentTarget:'Target',startExperiment:'Start',stopExperiment:'Stop',experimentGoal:'Goal {n}',experimentContacts:'{n}/{target} contacts',experimentResponses:'{n} responses',experimentNextVariant:'Next',experimentNextHelp:'Balance',experimentManagerOnly:'Manager',experimentNeedsData:'Need {w} {p}',experimentNeedsActionData:'Need action',experimentCollecting:'Collecting',experimentCompleted:'Completed',experimentStopped:'Stopped',experimentHistoryGuardrail:'Descriptive only',action_followup:'Follow-up',action_reactivate:'Reactivate',channelPhone:'Phone',insightPositive:'{n} positive',
    experimentReview:'Review',experimentReviewReady:'Review ready',experimentReviewContextSaved:'Context saved',experimentReviewStale:'Review stale',experimentReviewHelp:'Factual review',reviewContacts:'{n} contacts',reviewSmallSample:'Small {n}',reviewResponseRate:'{rate}% responses · {responses}/{total}',reviewPositiveRate:'{rate}% positive · {n}',reviewResponseSpread:'Response spread',reviewPositiveSpread:'Positive spread',reviewNotComparable:'Not comparable',reviewTargetIncomplete:'Target incomplete',reviewDecisionNote:'Decision note',reviewDecisionNotePlaceholder:'Optional',useAsContext:'Use as context',createNewExperiment:'New experiment',experimentReviewGuardrail:'Does not change Autopilot',
  };
  const snapshot={channelDetailedSample:12,channelDetails:{whatsapp:{total:6},phone:{total:6}},actionTypeDetails:{quote_followup:{total:7}}};
  const html=renderGuidedExperiment({experiments:[completed],snapshot,canManage:true,t:key=>labels[key]||key,esc:String});
  assert.match(html,/60% responses/);
  assert.match(html,/40% responses/);
  assert.match(html,/20 pp/);
  assert.match(html,/data-review-context="exp-review"/);
  assert.match(html,/data-new-experiment="true"/);
  assert.match(html,/Does not change Autopilot/);
  assert.equal(/winner:|best channel|recommended channel/i.test(html),false);
});

test('backend review endpoint is manager-only, immutable to operations and stores a factual snapshot',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/experiments/:experimentId/review'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/action-events'",start);
  const block=server.slice(start,end);
  assert.ok(start>0&&end>start);
  for(const token of [
    'canManageNestLocal(req.access)',
    "decision!=='context_only'",
    'experimentReviewSnapshot(data)',
    'reviewStale:false',
    "data.status==='active'",
    "'EXPERIMENT_REVIEW_NOT_READY'",
  ]) assert.ok(block.includes(token),'missing '+token);
  assert.equal(block.includes('nestlocal_requests'),false);
  assert.equal(block.includes('nestlocal_customers'),false);
  assert.equal(block.includes('assistanceCooldowns'),false);
});

test('outcome refinement makes a previously acknowledged review stale without duplicating samples',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/action-events'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/messages/prepare'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes("reviewChanged=previousOutcome!==outcome&&Boolean(expData.review?.decision)"));
  assert.ok(block.includes("reviewStale=expData.reviewStale===true||reviewChanged"));
  assert.ok(block.includes('updateExperimentProgress(expData'));
  assert.ok(block.includes('counted:true'));
});

test('review UX is translated, wired and responsive',()=>{
  const client=read('../web/live.js'),css=read('../web/operations.css'),ui=read('../web/guided-experiment.js');
  for(const token of [
    "experimentReview:'Revisão do experimento'",
    "experimentReview:'Experiment review'",
    "experimentReview:'Revisión del experimento'",
    'data-review-context',
    'data-experiment-review-note',
    'data-new-experiment',
    "decision:'context_only'",
  ]) assert.ok(client.includes(token)||ui.includes(token),'missing '+token);
  for(const token of ['.experiment-review','.experiment-review-grid','.experiment-review-spread','.experiment-review-decision']) assert.ok(css.includes(token),'missing '+token);
});
