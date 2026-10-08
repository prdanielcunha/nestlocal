// NestLocal Pulse 2.0: presentation derives exclusively from already eligible Next Best Actions.
// No inference, model call, customer behavior prediction or automatic mutations.
const TYPES=new Set(['finish','schedule','reschedule','execute','review','followup','collect','reactivate']);
const safeMs=(raw)=>{
  if(!raw)return 0;
  if(typeof raw==='number')return Number.isFinite(raw)?raw:0;
  if(typeof raw?.seconds==='number')return raw.seconds*1000;
  if(typeof raw?._seconds==='number')return raw._seconds*1000;
  if(typeof raw==='string'){const n=Date.parse(raw);return Number.isFinite(n)?n:0}
  return 0;
};
const validId=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(s);
export function buildPulseSnapshot({actions=[],requests=[],customers=[],feedback=[],now=Date.now(),today='',maxCards=8}={}){
  const requestById=new Map(requests.map(r=>[r.id,r])),customerById=new Map(customers.map(c=>[c.id,c]));
  const states=new Map(feedback.filter(x=>typeof x.actionId==='string').map(x=>[x.actionId,x]));
  const cards=[];
  for(const action of actions){
    if(!TYPES.has(action?.type))continue;
    const kind=action.type==='reactivate'?'customer':'request';
    const entityId=kind==='customer'?action.customerId:action.requestId;
    if(!validId(entityId))continue;
    const record=kind==='customer'?customerById.get(entityId):requestById.get(entityId);
    if(!record)continue;
    const timestamp=safeMs(record.updatedAt)||safeMs(record.createdAt)||safeMs(record.lastCompletedAt);
    // An undated quotation must not be mislabeled as 48h old.
    if(action.type==='followup'&&(!timestamp||now-timestamp<48*3600000))continue;
    const date=kind==='customer'?record.nextServiceDate:record.schedule?.date||record.preference?.date||'';
    if(action.type==='reactivate'&&(!date||date>today))continue;
    if(action.type==='execute'&&(!date||date>today))continue;
    const fact={status:String(record.status||''),date:String(date||''),observedAt:timestamp?new Date(timestamp).toISOString():null};
    if(action.type==='collect'){
      if(record.status!=='completed'||!['pending','partial'].includes(record.commercial?.paymentStatus||''))continue;
      const total=Number(record.commercial?.finalAmountCents??record.quote?.totalCents??0),paid=Number(record.commercial?.amountPaidCents||0);
      fact.balanceCents=Math.max(0,total-paid);
      if(!Number.isSafeInteger(fact.balanceCents)||fact.balanceCents<=0)continue;
    }
    if(action.type==='followup')fact.ageHours=Math.floor((now-timestamp)/3600000);
    if(action.type==='reactivate')fact.reason=String(record.nextServiceReason||record.lastServiceId||'').slice(0,140);
    if(action.type==='reschedule'&&!['no_show','scheduled'].includes(record.status))continue;
    const actionId=action.type+':'+entityId;
    const previous=states.get(actionId);
    if(previous?.outcome==='dismiss')continue;
    if(previous?.outcome==='snooze'&&typeof previous.until==='string'&&previous.until>today)continue;
    cards.push({
      actionId,type:action.type,priority:Number(action.priority)||0,
      generatedAt:new Date(now).toISOString(),sourceRefs:[{kind,id:entityId}],
      facts:fact,customerName:String(action.customerName||record.customer?.name||record.name||'').slice(0,100),
      sourceLabel:kind==='customer'?'customer':'request',entityId,
      // Never attach private phone numbers, free-text notes or unverified amounts to explanatory cards.
    });
  }
  cards.sort((a,b)=>b.priority-a.priority||a.actionId.localeCompare(b.actionId));
  return {generatedAt:new Date(now).toISOString(),cards:cards.slice(0,Math.max(1,Math.min(20,maxCards))),total:cards.length};
}
export function renderPulse({snapshot,t,esc,money}){
  const cards=snapshot?.cards||[];
  const first=cards[0];
  const actionButton=(c)=>c.type==='reactivate'
    ? '<button class="button primary small" data-scroll-reactivation="true">'+t('pulseOpen')+'</button>'
    : '<button class="button primary small" data-open-request="'+esc(c.entityId)+'">'+t('pulseOpen')+'</button>';
  const item=c=>'<div class="pulse2-item">'+
    '<div class="pulse2-item-body"><span class="pulse2-kind">'+t('action_'+c.type)+'</span>'+
    '<strong>'+esc(c.customerName||'—')+'</strong>'+
    '<p>'+t('pulseSource')+': '+esc(c.sourceLabel)+' #'+esc(c.entityId)+' · '+esc(c.facts.status||'—')+
      (c.facts.date?' · '+esc(c.facts.date):'')+
      (Number.isInteger(c.facts.ageHours)?' · '+esc(c.facts.ageHours)+'h':'')+
      (Number.isSafeInteger(c.facts.balanceCents)?' · '+money(c.facts.balanceCents):'')+
    '</p></div><div class="pulse2-actions">'+actionButton(c)+
      '<button class="button small" data-pulse-feedback="snooze" data-action-id="'+esc(c.actionId)+'">'+t('pulseSnooze')+'</button>'+
      '<button class="button small" data-pulse-feedback="dismiss" data-action-id="'+esc(c.actionId)+'">'+t('pulseDismiss')+'</button></div></div>';
  return '<section class="card pulse2-panel"><header class="pulse2-header"><div><span class="eyebrow">NESTLOCAL / PULSE</span>'+
    '<h2>'+t('pulseTitle')+'</h2><p class="help">'+t('pulseIntro')+'</p></div>'+
    '<span class="pulse2-count">'+cards.length+'</span></header>'+
    (first?'<div class="pulse2-focus"><span class="pulse2-label">'+t('pulseNext')+'</span><h3>'+t('action_'+first.type)+'</h3>'+
      '<p>'+t('pulseWhy')+': '+esc(first.facts.status||'—')+
      (first.facts.date?' · '+esc(first.facts.date):'')+'</p>'+actionButton(first)+'</div>':
      '<div class="pulse2-empty"><strong>'+t('pulseEmpty')+'</strong><p>'+t('pulseEmptyHelp')+'</p></div>')+
    (cards.length?'<details class="pulse2-queue"><summary>'+t('pulseQueue')+' · '+cards.length+'</summary>'+
     '<div class="pulse2-items">'+cards.map(item).join('')+'</div></details>':'')+
    '<p class="pulse2-disclaimer">'+t('pulseTrust')+' · '+t('pulseGenerated')+': '+esc(snapshot.generatedAt||'')+'</p></section>';
}
