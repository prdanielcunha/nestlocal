const count=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?Math.floor(n):0};

const bump=(source,key,delta)=>{
  const next={...(source||{})};
  next[key]=Math.max(0,count(next[key])+delta);
  return next;
};

const updateCohort=(source,key,{outcome,previousOutcome='',counted=false}={})=>{
  const next={...(source||{})},current={...(next[key]||{})};
  let total=count(current.total),outcomes={...(current.outcomes||{})};
  if(!counted){
    total+=1;
    outcomes=bump(outcomes,outcome,1);
  }else if(previousOutcome&&previousOutcome!==outcome){
    outcomes=bump(outcomes,previousOutcome,-1);
    outcomes=bump(outcomes,outcome,1);
  }
  next[key]={total,outcomes};
  return next;
};

export function updateActionMetric(metric={}, {day,outcome,channel,actionType,previousOutcome='',counted=false,cohortCounted=counted}={}){
  let total=count(metric.total),outcomes={...(metric.outcomes||{})},channels={...(metric.channels||{})},actionTypes={...(metric.actionTypes||{})};
  if(!counted){
    total+=1;
    outcomes=bump(outcomes,outcome,1);
    channels=bump(channels,channel,1);
    actionTypes=bump(actionTypes,actionType,1);
  }else if(previousOutcome&&previousOutcome!==outcome){
    outcomes=bump(outcomes,previousOutcome,-1);
    outcomes=bump(outcomes,outcome,1);
  }
  const channelOutcomes=updateCohort(metric.channelOutcomes,channel,{outcome,previousOutcome,counted:cohortCounted});
  const actionTypeOutcomes=updateCohort(metric.actionTypeOutcomes,actionType,{outcome,previousOutcome,counted:cohortCounted});
  return {date:String(day||''),total,outcomes,channels,actionTypes,channelOutcomes,actionTypeOutcomes,cohortSchemaVersion:1};
}

const emptyOutcomeSummary=()=>({unresolved:0,no_response:0,asked_later:0,positive_signal:0,not_interested:0});

const mergeCohorts=(target,source,keys)=>{
  for(const key of keys){
    const row=source?.[key];if(!row)continue;
    if(!target[key])target[key]={total:0,outcomes:emptyOutcomeSummary()};
    target[key].total+=count(row.total);
    for(const outcome of Object.keys(target[key].outcomes))target[key].outcomes[outcome]+=count(row.outcomes?.[outcome]);
  }
  return target;
};

const finalizeCohorts=(source,keys)=>{
  const result={};
  for(const key of keys){
    const row=source[key]||{total:0,outcomes:emptyOutcomeSummary()},o=row.outcomes||{},total=count(row.total);
    result[key]={
      total,
      responseRecorded:count(o.asked_later)+count(o.positive_signal)+count(o.not_interested),
      positiveSignals:count(o.positive_signal),
      noResponses:count(o.no_response),
      askedLater:count(o.asked_later),
      notInterested:count(o.not_interested),
      unresolved:count(o.unresolved),
    };
  }
  return result;
};

export function actionOutcomeSnapshot(rows=[], {periodStart='',periodEnd='',windowDays=30}={}){
  const outcomes=emptyOutcomeSummary();
  const channels={whatsapp:0,phone:0,email:0,other:0};
  const actionTypes={quote_followup:0,customer_reactivation:0};
  const channelKeys=Object.keys(channels),actionTypeKeys=Object.keys(actionTypes),channelCohorts={},actionTypeCohorts={};
  let total=0,daysWithData=0;
  for(const row of rows){
    const rowTotal=count(row?.total);
    total+=rowTotal;
    if(rowTotal>0)daysWithData+=1;
    for(const key of Object.keys(outcomes))outcomes[key]+=count(row?.outcomes?.[key]);
    for(const key of channelKeys)channels[key]+=count(row?.channels?.[key]);
    for(const key of actionTypeKeys)actionTypes[key]+=count(row?.actionTypes?.[key]);
    mergeCohorts(channelCohorts,row?.channelOutcomes,channelKeys);
    mergeCohorts(actionTypeCohorts,row?.actionTypeOutcomes,actionTypeKeys);
  }
  const responseRecorded=outcomes.asked_later+outcomes.positive_signal+outcomes.not_interested;
  const channelDetails=finalizeCohorts(channelCohorts,channelKeys),actionTypeDetails=finalizeCohorts(actionTypeCohorts,actionTypeKeys);
  const channelDetailedSample=channelKeys.reduce((sum,key)=>sum+channelDetails[key].total,0);
  const actionTypeDetailedSample=actionTypeKeys.reduce((sum,key)=>sum+actionTypeDetails[key].total,0);
  return {
    windowDays:Number.isInteger(Number(windowDays))&&Number(windowDays)>0?Number(windowDays):30,
    periodStart:String(periodStart||''),
    periodEnd:String(periodEnd||''),
    total,
    responseRecorded,
    positiveSignals:outcomes.positive_signal,
    noResponses:outcomes.no_response,
    askedLater:outcomes.asked_later,
    notInterested:outcomes.not_interested,
    unresolved:outcomes.unresolved,
    channels,
    actionTypes,
    channelDetails,
    actionTypeDetails,
    channelDetailedSample,
    actionTypeDetailedSample,
    daysWithData,
  };
}
