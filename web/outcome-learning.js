const count=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?Math.floor(n):0};

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
  return {
    total,responseRecorded,positiveSignals,noResponses,channels,actionTypes,
    windowDays:count(input.windowDays)||30,
    periodStart:String(input.periodStart||''),
    periodEnd:String(input.periodEnd||''),
    hasData:total>0,
  };
}

export function renderOutcomeLearning({snapshot={},t,esc}){
  const model=buildOutcomeLearningModel(snapshot);
  const period=model.periodStart&&model.periodEnd?`${esc(model.periodStart)} → ${esc(model.periodEnd)}`:`${model.windowDays} ${t('days')}`;
  if(!model.hasData){
    return `<article class="card outcome-learning"><div class="section-title"><div><h2>${t('autopilotLearning')}</h2><p class="help">${t('autopilotLearningHelp')}</p></div><span class="tag">${model.windowDays} ${t('days')}</span></div><div class="learning-empty">${t('noLearningData')}</div><p class="learning-guardrail">${t('learningGuardrail')}</p></article>`;
  }
  const channelLabel=key=>key==='whatsapp'?'WhatsApp':key==='phone'?t('channelPhone'):key==='email'?'E-mail':t('channelOther');
  const actionLabel=key=>key==='quote_followup'?t('action_followup'):t('action_reactivate');
  const chips=(rows,labeler)=>rows.map(([key,value])=>`<span class="learning-chip"><b>${esc(labeler(key))}</b><strong>${value}</strong></span>`).join('');
  return `<article class="card outcome-learning"><div class="section-title"><div><h2>${t('autopilotLearning')}</h2><p class="help">${t('autopilotLearningHelp')}</p></div><span class="tag">${period}</span></div><div class="learning-metrics"><div><span>${t('contactsRecorded')}</span><strong>${model.total}</strong></div><div><span>${t('responsesRecorded')}</span><strong>${model.responseRecorded}</strong></div><div class="positive"><span>${t('positiveSignals')}</span><strong>${model.positiveSignals}</strong></div><div><span>${t('noResponses')}</span><strong>${model.noResponses}</strong></div></div><div class="learning-breakdowns"><section><span>${t('byChannel')}</span><div>${chips(model.channels,channelLabel)||'<small>—</small>'}</div></section><section><span>${t('byAction')}</span><div>${chips(model.actionTypes,actionLabel)||'<small>—</small>'}</div></section></div><p class="learning-guardrail">${t('learningGuardrail')}</p></article>`;
}
