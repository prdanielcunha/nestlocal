import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { experimentContextForAction, renderExperimentContext } from '../web/guided-experiment.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

const reviewed=(overrides={})=>({
  id:'exp-reviewed',
  status:'completed',
  actionType:'quote_followup',
  reviewStale:false,
  progress:{whatsapp:{total:99,outcomes:{positive_signal:99}},phone:{total:99,outcomes:{positive_signal:99}}},
  review:{
    decision:'context_only',
    note:'Manter como referência, sem automatizar.',
    snapshot:{
      version:1,
      experimentId:'exp-reviewed',
      status:'completed',
      actionType:'quote_followup',
      targetPerVariant:5,
      sampleTotal:10,
      complete:true,
      comparable:true,
      variants:{
        whatsapp:{total:5,responses:3,positiveSignals:2,comparable:true,responseRate:60,positiveRate:40},
        phone:{total:5,responses:2,positiveSignals:1,comparable:true,responseRate:40,positiveRate:20},
      },
      responseSpreadPp:20,
      positiveSpreadPp:20,
      limitations:['descriptive_only'],
    },
  },
  ...overrides,
});

test('operational memory uses the frozen reviewed snapshot, not mutable live progress',()=>{
  const context=experimentContextForAction([reviewed()],{type:'followup'});
  assert.ok(context);
  assert.equal(context.variants[0].responseRate,60);
  assert.equal(context.variants[1].responseRate,40);
  assert.equal(context.sampleTotal,10);
  assert.equal(context.note,'Manter como referência, sem automatizar.');
});

test('stale or unreviewed experiments never become operational memory',()=>{
  assert.equal(experimentContextForAction([reviewed({reviewStale:true})],{type:'followup'}),null);
  assert.equal(experimentContextForAction([reviewed({review:null})],{type:'followup'}),null);
  assert.equal(experimentContextForAction([reviewed({review:{decision:'other'}})],{type:'followup'}),null);
});

test('active experiment of the same action type suppresses prior context to avoid contaminating the sample',()=>{
  const active={id:'exp-active',status:'active',actionType:'quote_followup'};
  assert.equal(experimentContextForAction([active,reviewed()],{type:'followup'}),null);
});

test('active experiment for a different action type does not hide reviewed context',()=>{
  const active={id:'exp-active',status:'active',actionType:'customer_reactivation'};
  const context=experimentContextForAction([active,reviewed()],{type:'followup'});
  assert.equal(context?.id,'exp-reviewed');
});

test('memory is action-type specific and ignores unsupported actions',()=>{
  assert.equal(experimentContextForAction([reviewed()],{type:'reactivate'}),null);
  assert.equal(experimentContextForAction([reviewed()],{type:'collect'}),null);
});

test('renderer shows factual sample and spread without selecting a channel',()=>{
  const t=key=>({
    operationalMemory:'Operational memory',
    reviewedContext:'Reviewed context',
    reviewedContextHelp:'Human-reviewed evidence',
    contextSampleOnly:'{n} contacts only',
    contextResponseRate:'{rate}% responses · {responses}/{total}',
    contextObservedSpread:'Observed spread',
    contextIncompleteExperiment:'Incomplete target',
    reviewedContextGuardrail:'Context only; no channel selection.',
    channelPhone:'Phone',
  }[key]||key);
  const html=renderExperimentContext({context:experimentContextForAction([reviewed()],{type:'followup'}),t,esc:String});
  assert.match(html,/60% responses · 3\/5/);
  assert.match(html,/40% responses · 2\/5/);
  assert.match(html,/20 pp/);
  assert.match(html,/Manter como referência/);
  assert.match(html,/Context only/);
  assert.equal(/winner:|best channel|recommended channel|use whatsapp|use phone/i.test(html),false);
});

test('incomplete reviewed experiment stays descriptive and keeps sample warning',()=>{
  const exp=reviewed({review:{decision:'context_only',note:'',snapshot:{version:1,experimentId:'x',status:'stopped',actionType:'quote_followup',targetPerVariant:5,sampleTotal:6,complete:false,comparable:false,variants:{whatsapp:{total:4,responses:2,positiveSignals:1,comparable:false,responseRate:null,positiveRate:null},phone:{total:2,responses:1,positiveSignals:0,comparable:false,responseRate:null,positiveRate:null}},responseSpreadPp:null,positiveSpreadPp:null,limitations:['target_incomplete','small_variant_sample','descriptive_only']}}});
  const context=experimentContextForAction([exp],{type:'followup'});
  assert.equal(context.complete,false);
  assert.equal(context.comparable,false);
  assert.equal(context.variants[0].responseRate,null);
});

test('Action Assistant integration is translated and keeps context outside priority logic',()=>{
  const client=read('../web/live.js'),ui=read('../web/guided-experiment.js'),css=read('../web/operations.css');
  for(const token of [
    'experimentContextForAction',
    'renderExperimentContext',
    "operationalMemory:'Memória operacional'",
    "operationalMemory:'Operational memory'",
    "operationalMemory:'Memoria operativa'",
    'experimentContextHtml',
  ]) assert.ok(client.includes(token)||ui.includes(token),'missing '+token);
  for(const token of ['.assist-context','.assist-context-grid','.assist-context-spread','.assist-context-guardrail']) assert.ok(css.includes(token),'missing '+token);
  const nextStart=client.indexOf('function nextBestActions()'),nextEnd=client.indexOf('function actionControls',nextStart);
  assert.equal(client.slice(nextStart,nextEnd).includes('experimentContextForAction'),false);
});
