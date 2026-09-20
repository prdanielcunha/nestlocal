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
    const row=raw.progress?.[variant]||{},summary=outcomes(row);
    progress[variant]={total:count(row.total),responses:summary.responses,positive:summary.positive};
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

const variantLabel=(key,t)=>key==='whatsapp'?'WhatsApp':t('channelPhone');
const actionLabel=(key,t)=>key==='quote_followup'?t('action_followup'):t('action_reactivate');

const progressRows=({experiment,t,esc})=>experiment.variants.map(variant=>{
  const row=experiment.progress[variant]||{total:0,responses:0,positive:0};
  return `<div class="experiment-variant"><div><strong>${esc(variantLabel(variant,t))}</strong><small>${t('experimentContacts').replace('{n}',String(row.total)).replace('{target}',String(experiment.targetPerVariant))}</small></div><span><b>${t('experimentResponses').replace('{n}',String(row.responses))}</b><small>${t('insightPositive').replace('{n}',String(row.positive))}</small></span></div>`;
}).join('');

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
  const history=recent?`<div class="experiment-history"><span>${recent.status==='completed'?t('experimentCompleted'):t('experimentStopped')}</span><strong>${esc(actionLabel(recent.actionType,t))}</strong><div class="experiment-progress">${progressRows({experiment:recent,t,esc})}</div><small>${t('experimentHistoryGuardrail')}</small></div>`:'';
  return `<div class="guided-experiment"><div class="guided-experiment-title"><div><span>${t('guidedExperiment')}</span><strong>${t('guidedExperimentTitle')}</strong></div><small>${t('guidedExperimentGuardrail')}</small></div>${body}${history}</div>`;
}

export function renderExperimentAssist({match,t,esc}){
  if(!match?.experiment)return '';
  if(!match.eligible)return `<div class="assist-experiment muted"><span>${t('guidedExperimentActive')}</span><strong>${t('experimentContactNotEligible')}</strong><small>${t('experimentContactNotEligibleHelp')}</small></div>`;
  const label=variantLabel(match.suggestedVariant,t);
  return `<div class="assist-experiment"><span>${t('guidedExperimentActive')}</span><strong>${t('experimentSuggestedVariant').replace('{channel}',esc(label))}</strong><small>${t('experimentSuggestionHelp')}</small></div>`;
}
