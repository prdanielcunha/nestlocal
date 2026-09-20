const count=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?Math.floor(n):0};
const outcomes=row=>({
  responses:count(row?.outcomes?.asked_later)+count(row?.outcomes?.positive_signal)+count(row?.outcomes?.not_interested),
  positive:count(row?.outcomes?.positive_signal),
});

const normalizeExperiment=raw=>{
  if(!raw)return null;
  const variants=Array.isArray(raw.variants)?raw.variants.filter(v=>['whatsapp','phone'].includes(v)).slice(0,2):['whatsapp','phone'];
  const target=Math.max(5,count(raw.targetPerVariant)||5),progress={};
  for(const variant of variants){
    const row=raw.progress?.[variant]||{},summary=outcomes(row),hasSummary=Number.isFinite(Number(row.responses))||Number.isFinite(Number(row.positive));
    progress[variant]={total:count(row.total),responses:hasSummary?count(row.responses):summary.responses,positive:hasSummary?count(row.positive):summary.positive,outcomes:{...(row.outcomes||{})}};
  }
  const open=variants.filter(v=>(progress[v]?.total||0)<target);
  const nextVariant=open.slice().sort((a,b)=>(progress[a]?.total||0)-(progress[b]?.total||0)||variants.indexOf(a)-variants.indexOf(b))[0]||'';
  return {...raw,variants,targetPerVariant:target,progress,nextVariant};
};

export function guidedExperimentState(experiments=[],snapshot={},canManage=false){
  const rows=(experiments||[]).map(normalizeExperiment).filter(Boolean);
  const active=rows.find(x=>x.status==='active')||null;
  const recent=rows.find(x=>x.status!=='active')||null;
  const whatsapp=count(snapshot.channelDetails?.whatsapp?.total),phone=count(snapshot.channelDetails?.phone?.total),detailed=count(snapshot.channelDetailedSample);
  const eligibleActions=['quote_followup','customer_reactivation'].filter(key=>count(snapshot.actionTypeDetails?.[key]?.total)>=5);
  const channelsReady=detailed>=10&&whatsapp>=5&&phone>=5;
  return {active,recent,eligibleActions,channelsReady,canStart:Boolean(canManage&&!active&&channelsReady&&eligibleActions.length),canManage:Boolean(canManage),detailed,whatsapp,phone};
}

export function experimentForAction(experiments=[],action={}){
  const active=(experiments||[]).map(normalizeExperiment).find(x=>x?.status==='active');
  if(!active)return null;
  const actionType=action.type==='followup'?'quote_followup':action.type==='reactivate'?'customer_reactivation':'';
  const phone=String(action.phone||'').replace(/\D/g,'');
  if(!actionType||active.actionType!==actionType||!phone||action.whatsappAllowed!==true)return {experiment:active,eligible:false,reason:'channels'};
  if(!active.nextVariant)return {experiment:active,eligible:false,reason:'full'};
  return {experiment:active,eligible:true,suggestedVariant:active.nextVariant};
}

const actionTypeForAction=action=>action?.type==='followup'?'quote_followup':action?.type==='reactivate'?'customer_reactivation':'';

export function experimentContextForAction(experiments=[],action={}){
  const actionType=actionTypeForAction(action);if(!actionType)return null;
  const rows=(experiments||[]).filter(Boolean);
  if(rows.some(exp=>exp.status==='active'&&exp.actionType===actionType))return null;
  for(const exp of rows){
    if(exp.status==='active'||exp.actionType!==actionType||exp.review?.decision!=='context_only'||exp.reviewStale===true)continue;
    const snapshot=exp.review?.snapshot;if(!snapshot||snapshot.actionType!==actionType||snapshot.version!==1)continue;
    const variants=['whatsapp','phone'].map(key=>{const row=snapshot.variants?.[key]||{},responseRate=row.responseRate==null?null:Number(row.responseRate),positiveRate=row.positiveRate==null?null:Number(row.positiveRate);return{key,total:count(row.total),responses:count(row.responses),positive:count(row.positiveSignals),comparable:row.comparable===true,responseRate:Number.isFinite(responseRate)?responseRate:null,positiveRate:Number.isFinite(positiveRate)?positiveRate:null}});
    if(!variants.some(row=>row.total>0))continue;
    return {id:String(exp.id||snapshot.experimentId||''),actionType,note:String(exp.review?.note||''),sampleTotal:count(snapshot.sampleTotal),complete:snapshot.complete===true,comparable:snapshot.comparable===true,variants,responseSpreadPp:snapshot.responseSpreadPp==null?null:(Number.isFinite(Number(snapshot.responseSpreadPp))?Number(snapshot.responseSpreadPp):null),positiveSpreadPp:snapshot.positiveSpreadPp==null?null:(Number.isFinite(Number(snapshot.positiveSpreadPp))?Number(snapshot.positiveSpreadPp):null)};
  }
  return null;
}


export function buildExperimentReviewModel(raw={}){
  const experiment=normalizeExperiment(raw);if(!experiment)return null;
  const variants=experiment.variants.map(key=>{
    const row=experiment.progress[key]||{total:0,responses:0,positive:0},total=count(row.total),comparable=total>=5;
    return {key,total,responses:count(row.responses),positive:count(row.positive),comparable,responseRate:comparable?Math.round(count(row.responses)/total*100):null,positiveRate:comparable?Math.round(count(row.positive)/total*100):null};
  });
  const comparable=variants.length===2&&variants.every(row=>row.comparable),reviewed=raw.review?.decision==='context_only',stale=raw.reviewStale===true;
  return {
    id:experiment.id,status:experiment.status,actionType:experiment.actionType,targetPerVariant:experiment.targetPerVariant,
    sampleTotal:variants.reduce((sum,row)=>sum+row.total,0),variants,comparable,complete:variants.length===2&&variants.every(row=>row.total>=experiment.targetPerVariant),
    responseSpreadPp:comparable?Math.abs(variants[0].responseRate-variants[1].responseRate):null,
    positiveSpreadPp:comparable?Math.abs(variants[0].positiveRate-variants[1].positiveRate):null,
    reviewed,stale,review:raw.review||null,
  };
}

const variantLabel=(key,t)=>key==='whatsapp'?'WhatsApp':t('channelPhone');
const actionLabel=(key,t)=>key==='quote_followup'?t('action_followup'):t('action_reactivate');

const progressRows=({experiment,t,esc})=>experiment.variants.map(variant=>{
  const row=experiment.progress[variant]||{total:0,responses:0,positive:0};
  return `<div class="experiment-variant"><div><strong>${esc(variantLabel(variant,t))}</strong><small>${t('experimentContacts').replace('{n}',String(row.total)).replace('{target}',String(experiment.targetPerVariant))}</small></div><span><b>${t('experimentResponses').replace('{n}',String(row.responses))}</b><small>${t('insightPositive').replace('{n}',String(row.positive))}</small></span></div>`;
}).join('');

const reviewRows=({review,t,esc})=>review.variants.map(row=>{
  const label=esc(variantLabel(row.key,t)),sample=t('reviewContacts').replace('{n}',String(row.total));
  if(!row.comparable)return `<div class="experiment-review-variant small-sample"><div><strong>${label}</strong><small>${esc(sample)}</small></div><span>${t('reviewSmallSample').replace('{n}',String(row.total))}</span></div>`;
  const response=t('reviewResponseRate').replace('{rate}',String(row.responseRate)).replace('{responses}',String(row.responses)).replace('{total}',String(row.total));
  const positive=t('reviewPositiveRate').replace('{rate}',String(row.positiveRate)).replace('{n}',String(row.positive));
  return `<div class="experiment-review-variant"><div><strong>${label}</strong><small>${esc(sample)}</small></div><span><b>${esc(response)}</b><small>${esc(positive)}</small></span></div>`;
}).join('');

const renderExperimentReview=({experiment,state,t,esc})=>{
  const review=buildExperimentReviewModel(experiment);if(!review)return '';
  const status=review.stale?t('experimentReviewStale'):review.reviewed?t('experimentReviewContextSaved'):t('experimentReviewReady');
  const note=review.reviewed&&review.review?.note?`<p class="experiment-review-note">${esc(review.review.note)}</p>`:'';
  const comparison=review.comparable?`<div class="experiment-review-spread"><div><span>${t('reviewResponseSpread')}</span><strong>${review.responseSpreadPp} pp</strong></div><div><span>${t('reviewPositiveSpread')}</span><strong>${review.positiveSpreadPp} pp</strong></div></div>`:`<div class="experiment-review-limit">${t('reviewNotComparable')}</div>`;
  const targetNotice=!review.complete?`<div class="experiment-review-limit">${t('reviewTargetIncomplete')}</div>`:'';
  const reviewAction=state.canManage&&(!review.reviewed||review.stale)?`<div class="experiment-review-decision"><label>${t('reviewDecisionNote')}<input maxlength="180" data-experiment-review-note="${esc(review.id)}" placeholder="${esc(t('reviewDecisionNotePlaceholder'))}"></label><button class="button small" data-review-context="${esc(review.id)}">${t('useAsContext')}</button></div>`:'';
  const newExperiment=state.canStart?`<button class="button tiny" data-new-experiment="true">${t('createNewExperiment')}</button>`:'';
  return `<section class="experiment-review ${review.stale?'stale':''}"><div class="experiment-review-head"><div><span>${t('experimentReview')}</span><strong>${esc(status)}</strong><small>${t('experimentReviewHelp')}</small></div>${newExperiment}</div><div class="experiment-review-grid">${reviewRows({review,t,esc})}</div>${comparison}${targetNotice}${note}${reviewAction}<small class="experiment-review-guardrail">${t('experimentReviewGuardrail')}</small></section>`;
};


export function renderGuidedExperiment({experiments=[],snapshot={},canManage=false,t,esc}){
  const state=guidedExperimentState(experiments,snapshot,canManage),active=state.active,recent=state.recent;
  let body='';
  if(active){
    body=`<div class="experiment-head"><div><span>${t('guidedExperimentActive')}</span><strong>${esc(actionLabel(active.actionType,t))}</strong><small>${t('experimentGoal').replace('{n}',String(active.targetPerVariant))}</small></div>${state.canManage?`<button class="button tiny" data-stop-experiment="${esc(active.id)}">${t('stopExperiment')}</button>`:''}</div><div class="experiment-progress">${progressRows({experiment:active,t,esc})}</div><div class="experiment-next"><span>${t('experimentNextVariant')}</span><strong>${esc(variantLabel(active.nextVariant||'whatsapp',t))}</strong><small>${t('experimentNextHelp')}</small></div>`;
  }else if(state.canStart){
    body=`<div class="experiment-head"><div><span>${t('guidedExperimentReady')}</span><strong>${t('guidedExperimentProposal')}</strong><small>${t('experimentStartHelp')}</small></div></div><div class="experiment-start"><label>${t('experimentAction')}<select id="experiment-action-type">${state.eligibleActions.map(key=>`<option value="${esc(key)}">${esc(actionLabel(key,t))}</option>`).join('')}</select></label><label>${t('experimentTarget')}<select id="experiment-target"><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option></select></label><button class="button small" data-start-experiment="true">${t('startExperiment')}</button></div>`;
  }else{
    const reason=!state.canManage?t('experimentManagerOnly'):state.channelsReady&&!state.eligibleActions.length?t('experimentNeedsActionData'):t('experimentNeedsData').replace('{w}',String(Math.max(0,5-state.whatsapp))).replace('{p}',String(Math.max(0,5-state.phone)));
    body=`<div class="experiment-head muted"><div><span>${t('guidedExperiment')}</span><strong>${t('experimentCollecting')}</strong><small>${esc(reason)}</small></div></div>`;
  }
  const history=recent?`<div class="experiment-history"><span>${recent.status==='completed'?t('experimentCompleted'):t('experimentStopped')}</span><strong>${esc(actionLabel(recent.actionType,t))}</strong><div class="experiment-progress">${progressRows({experiment:recent,t,esc})}</div><small>${t('experimentHistoryGuardrail')}</small>${renderExperimentReview({experiment:recent,state,t,esc})}</div>`:'';
  return `<div class="guided-experiment"><div class="guided-experiment-title"><div><span>${t('guidedExperiment')}</span><strong>${t('guidedExperimentTitle')}</strong></div><small>${t('guidedExperimentGuardrail')}</small></div>${body}${history}</div>`;
}


export function renderExperimentContext({context,t,esc}){
  if(!context)return '';
  const rows=context.variants.map(row=>{
    const label=esc(variantLabel(row.key,t));
    if(!row.comparable||row.responseRate===null)return `<div class="assist-context-variant"><strong>${label}</strong><small>${t('contextSampleOnly').replace('{n}',String(row.total))}</small></div>`;
    const response=t('contextResponseRate').replace('{rate}',String(row.responseRate)).replace('{responses}',String(row.responses)).replace('{total}',String(row.total));
    return `<div class="assist-context-variant"><strong>${label}</strong><small>${esc(response)}</small></div>`;
  }).join('');
  const spread=context.comparable&&context.responseSpreadPp!==null?`<div class="assist-context-spread"><span>${t('contextObservedSpread')}</span><strong>${context.responseSpreadPp} pp</strong></div>`:'';
  const incomplete=!context.complete?`<small class="assist-context-limit">${t('contextIncompleteExperiment')}</small>`:'';
  const note=context.note?`<p>${esc(context.note)}</p>`:'';
  return `<div class="assist-context"><div class="assist-context-head"><span>${t('operationalMemory')}</span><strong>${t('reviewedContext')}</strong><small>${t('reviewedContextHelp')}</small></div><div class="assist-context-grid">${rows}</div>${spread}${incomplete}${note}<small class="assist-context-guardrail">${t('reviewedContextGuardrail')}</small></div>`;
}

export function renderExperimentAssist({match,t,esc}){
  if(!match?.experiment)return '';
  if(!match.eligible)return `<div class="assist-experiment muted"><span>${t('guidedExperimentActive')}</span><strong>${t('experimentContactNotEligible')}</strong><small>${t('experimentContactNotEligibleHelp')}</small></div>`;
  const label=variantLabel(match.suggestedVariant,t);
  return `<div class="assist-experiment"><span>${t('guidedExperimentActive')}</span><strong>${t('experimentSuggestedVariant').replace('{channel}',esc(label))}</strong><small>${t('experimentSuggestionHelp')}</small></div>`;
}
