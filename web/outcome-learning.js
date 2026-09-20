const count=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?Math.floor(n):0};
const MIN_COHORT_SAMPLE=5;
const MIN_DETAILED_SAMPLE=10;

const normalizeCohorts=(source={},keys=[])=>keys.map(key=>{
  const row=source?.[key]||{},total=count(row.total),responses=Math.min(total,count(row.responseRecorded)),positiveSignals=Math.min(total,count(row.positiveSignals)),noResponses=Math.min(total,count(row.noResponses));
  return {key,total,responses,positiveSignals,noResponses,eligible:total>=MIN_COHORT_SAMPLE,responseRate:total?Math.round(responses/total*100):0,positiveRate:total?Math.round(positiveSignals/total*100):0};
}).filter(row=>row.total>0);

export function buildOutcomeLearningModel(input={}){
  const total=count(input.total);
  const responseRecorded=Math.min(total,count(input.responseRecorded));
  const positiveSignals=Math.min(total,count(input.positiveSignals));
  const noResponses=Math.min(total,count(input.noResponses));
  const channels=[
    ['whatsapp',count(input.channels?.whatsapp)],
    ['phone',count(input.channels?.phone)],
    ['email',count(input.channels?.email)],
    ['other',count(input.channels?.other)],
  ].filter(([,value])=>value>0);
  const actionTypes=[
    ['quote_followup',count(input.actionTypes?.quote_followup)],
    ['customer_reactivation',count(input.actionTypes?.customer_reactivation)],
  ].filter(([,value])=>value>0);
  const channelInsights=normalizeCohorts(input.channelDetails,['whatsapp','phone','email','other']);
  const actionInsights=normalizeCohorts(input.actionTypeDetails,['quote_followup','customer_reactivation']);
  const detailedSample=count(input.channelDetailedSample);
  const eligibleChannels=channelInsights.filter(row=>row.eligible).length;
  const eligibleActions=actionInsights.filter(row=>row.eligible).length;
  const insightStage=detailedSample<MIN_DETAILED_SAMPLE?'collecting':eligibleChannels<2?'one_channel':'comparable';
  return {
    total,responseRecorded,positiveSignals,noResponses,channels,actionTypes,
    channelInsights,actionInsights,detailedSample,eligibleChannels,eligibleActions,insightStage,
    minimumCohortSample:MIN_COHORT_SAMPLE,minimumDetailedSample:MIN_DETAILED_SAMPLE,
    windowDays:count(input.windowDays)||30,
    periodStart:String(input.periodStart||''),
    periodEnd:String(input.periodEnd||''),
    hasData:total>0,
  };
}

const cohortRows=({rows,labeler,t,esc})=>rows.map(row=>{
  const label=esc(labeler(row.key)),sample=t('insightSample').replace('{n}',String(row.total));
  if(!row.eligible)return `<div class="learning-insight-row low-sample"><div><strong>${label}</strong><small>${esc(sample)}</small></div><span>${t('insightSmallSample').replace('{n}',String(row.total))}</span></div>`;
  const responses=t('insightResponses').replace('{responses}',String(row.responses)).replace('{total}',String(row.total)).replace('{rate}',String(row.responseRate));
  const positive=t('insightPositive').replace('{n}',String(row.positiveSignals));
  return `<div class="learning-insight-row"><div><strong>${label}</strong><small>${esc(sample)}</small></div><span><b>${esc(responses)}</b><small>${esc(positive)}</small></span></div>`;
}).join('');

export function renderOutcomeLearning({snapshot={},t,esc}){
  const model=buildOutcomeLearningModel(snapshot);
  const period=model.periodStart&&model.periodEnd?`${esc(model.periodStart)} → ${esc(model.periodEnd)}`:`${model.windowDays} ${t('days')}`;
  if(!model.hasData){
    return `<article class="card outcome-learning"><div class="section-title"><div><h2>${t('autopilotLearning')}</h2><p class="help">${t('autopilotLearningHelp')}</p></div><span class="tag">${model.windowDays} ${t('days')}</span></div><div class="learning-empty">${t('noLearningData')}</div><p class="learning-guardrail">${t('learningGuardrail')}</p></article>`;
  }
  const channelLabel=key=>key==='whatsapp'?'WhatsApp':key==='phone'?t('channelPhone'):key==='email'?'E-mail':t('channelOther');
  const actionLabel=key=>key==='quote_followup'?t('action_followup'):t('action_reactivate');
  const chips=(rows,labeler)=>rows.map(([key,value])=>`<span class="learning-chip"><b>${esc(labeler(key))}</b><strong>${value}</strong></span>`).join('');
  const missing=Math.max(0,model.minimumDetailedSample-model.detailedSample);
  const status=model.insightStage==='collecting'?t('insightCollecting').replace('{n}',String(missing)):model.insightStage==='one_channel'?t('insightNeedSecondChannel').replace('{n}',String(model.minimumCohortSample)):t('insightComparable');
  const insightSections=model.channelInsights.length||model.actionInsights.length?`<div class="learning-insights"><div class="learning-insight-status ${model.insightStage}"><span>${t('explainableInsights')}</span><strong>${esc(status)}</strong><small>${t('insightCoverage').replace('{n}',String(model.detailedSample))}</small></div>${model.channelInsights.length?`<section><div class="learning-insight-head"><strong>${t('channelReading')}</strong><small>${t('minimumSample').replace('{n}',String(model.minimumCohortSample))}</small></div>${cohortRows({rows:model.channelInsights,labeler:channelLabel,t,esc})}</section>`:''}${model.actionInsights.length?`<section><div class="learning-insight-head"><strong>${t('actionReading')}</strong><small>${t('minimumSample').replace('{n}',String(model.minimumCohortSample))}</small></div>${cohortRows({rows:model.actionInsights,labeler:actionLabel,t,esc})}</section>`:''}</div>`:`<div class="learning-insight-status collecting"><span>${t('explainableInsights')}</span><strong>${t('insightStarting')}</strong><small>${t('insightCoverage').replace('{n}','0')}</small></div>`;
  return `<article class="card outcome-learning"><div class="section-title"><div><h2>${t('autopilotLearning')}</h2><p class="help">${t('autopilotLearningHelp')}</p></div><span class="tag">${period}</span></div><div class="learning-metrics"><div><span>${t('contactsRecorded')}</span><strong>${model.total}</strong></div><div><span>${t('responsesRecorded')}</span><strong>${model.responseRecorded}</strong></div><div class="positive"><span>${t('positiveSignals')}</span><strong>${model.positiveSignals}</strong></div><div><span>${t('noResponses')}</span><strong>${model.noResponses}</strong></div></div><div class="learning-breakdowns"><section><span>${t('byChannel')}</span><div>${chips(model.channels,channelLabel)||'<small>—</small>'}</div></section><section><span>${t('byAction')}</span><div>${chips(model.actionTypes,actionLabel)||'<small>—</small>'}</div></section></div>${insightSections}<p class="learning-guardrail">${t('learningGuardrail')}</p></article>`;
}
