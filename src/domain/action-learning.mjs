const count=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?Math.floor(n):0};

const bump=(source,key,delta)=>{
  const next={...(source||{})};
  next[key]=Math.max(0,count(next[key])+delta);
  return next;
};

export function updateActionMetric(metric={}, {day,outcome,channel,actionType,previousOutcome='',counted=false}={}){
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
  return {date:String(day||''),total,outcomes,channels,actionTypes};
}

export function actionOutcomeSnapshot(rows=[], {periodStart='',periodEnd='',windowDays=30}={}){
  const outcomes={unresolved:0,no_response:0,asked_later:0,positive_signal:0,not_interested:0};
  const channels={whatsapp:0,phone:0,email:0,other:0};
  const actionTypes={quote_followup:0,customer_reactivation:0};
  let total=0,daysWithData=0;
  for(const row of rows){
    const rowTotal=count(row?.total);
    total+=rowTotal;
    if(rowTotal>0)daysWithData+=1;
    for(const key of Object.keys(outcomes))outcomes[key]+=count(row?.outcomes?.[key]);
    for(const key of Object.keys(channels))channels[key]+=count(row?.channels?.[key]);
    for(const key of Object.keys(actionTypes))actionTypes[key]+=count(row?.actionTypes?.[key]);
  }
  const responseRecorded=outcomes.asked_later+outcomes.positive_signal+outcomes.not_interested;
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
    daysWithData,
  };
}
