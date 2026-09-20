const count=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?Math.floor(n):0};
const OUTCOMES=['unresolved','no_response','asked_later','positive_signal','not_interested'];

const emptyOutcomes=()=>({unresolved:0,no_response:0,asked_later:0,positive_signal:0,not_interested:0});
const bump=(source,key,delta)=>{
  const next={...(source||{})};
  next[key]=Math.max(0,count(next[key])+delta);
  return next;
};

export function guidedExperimentEligibility(snapshot={},actionType=''){
  const detailed=count(snapshot.channelDetailedSample);
  const whatsapp=count(snapshot.channelDetails?.whatsapp?.total);
  const phone=count(snapshot.channelDetails?.phone?.total);
  const actionSample=count(snapshot.actionTypeDetails?.[actionType]?.total);
  const missingDetailed=Math.max(0,10-detailed);
  const missingWhatsapp=Math.max(0,5-whatsapp);
  const missingPhone=Math.max(0,5-phone);
  const missingAction=Math.max(0,5-actionSample);
  return {
    eligible:detailed>=10&&whatsapp>=5&&phone>=5&&actionSample>=5,
    detailed,whatsapp,phone,actionSample,
    missingDetailed,missingWhatsapp,missingPhone,missingAction,
    variants:['whatsapp','phone'],
  };
}

export function normalizeExperiment(raw={}){
  const variants=Array.isArray(raw.variants)?raw.variants.filter(v=>['whatsapp','phone'].includes(v)).slice(0,2):['whatsapp','phone'];
  const targetPerVariant=Math.min(20,Math.max(5,count(raw.targetPerVariant)||5));
  const progress={};
  for(const variant of variants){
    const row=raw.progress?.[variant]||{};
    const outcomes=emptyOutcomes();
    for(const key of OUTCOMES)outcomes[key]=count(row.outcomes?.[key]);
    const total=count(row.total);
    progress[variant]={
      total,
      outcomes,
      responseRecorded:outcomes.asked_later+outcomes.positive_signal+outcomes.not_interested,
      positiveSignals:outcomes.positive_signal,
      remaining:Math.max(0,targetPerVariant-total),
    };
  }
  const complete=variants.length===2&&variants.every(v=>progress[v].total>=targetPerVariant),openVariants=variants.filter(v=>progress[v].total<targetPerVariant);
  const nextVariant=openVariants.length?openVariants.slice().sort((a,b)=>progress[a].total-progress[b].total||variants.indexOf(a)-variants.indexOf(b))[0]:'';
  return {
    id:String(raw.id||''),
    status:String(raw.status||''),
    dimension:String(raw.dimension||'channel'),
    actionType:String(raw.actionType||''),
    variants,
    targetPerVariant,
    progress,
    complete,
    nextVariant,
    total:variants.reduce((sum,v)=>sum+progress[v].total,0),
  };
}

export function updateExperimentProgress(raw={}, {variant,outcome,previousOutcome='',counted=false}={}){
  const experiment=normalizeExperiment(raw);
  if(!experiment.variants.includes(variant))return experiment;
  const current=experiment.progress[variant]||{total:0,outcomes:emptyOutcomes()};
  let total=count(current.total),outcomes={...(current.outcomes||{})};
  if(!counted){
    if(total>=experiment.targetPerVariant)return experiment;
    total+=1;
    outcomes=bump(outcomes,outcome,1);
  }else if(previousOutcome&&previousOutcome!==outcome){
    outcomes=bump(outcomes,previousOutcome,-1);
    outcomes=bump(outcomes,outcome,1);
  }
  const progress={...experiment.progress,[variant]:{total,outcomes}};
  return normalizeExperiment({...raw,id:experiment.id,status:experiment.status,dimension:experiment.dimension,actionType:experiment.actionType,variants:experiment.variants,targetPerVariant:experiment.targetPerVariant,progress});
}

export function canCountNewExperimentSample(raw={},variant=''){
  const experiment=normalizeExperiment(raw);
  return experiment.status==='active'&&experiment.variants.includes(variant)&&experiment.progress[variant].total<experiment.targetPerVariant&&!experiment.complete;
}
