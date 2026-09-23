import crypto from 'node:crypto';

const SIGNAL_HEADERS = {
  quote:'orçamento faz parte da venda',
  whatsapp:'whatsapp é canal forte',
  scheduling:'precisa agendar serviço/equipe',
  recurrence:'há recorrência',
  demand:'sinais públicos de demanda',
  smallTeam:'pequena equipe',
  ownerInvolved:'dono envolvido',
  noStrongSystem:'sem sistema forte aparente'
};

export const radarKey=value=>String(value??'').trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const radarPhone=value=>String(value??'').replace(/\D/g,'').slice(0,15);
const bounded=value=>Math.max(0,Math.min(100,Number(value)||0));
const signal=value=>{
  const normalized=String(value??'').trim().replace(',','.');
  const n=Number(normalized);
  return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
};
const parseDate=value=>{
  const raw=String(value??'').trim();
  if(!raw)return '';
  const br=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if(br)return `${br[3]}-${br[2]}-${br[1]}`;
  const iso=/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:'';
  return iso;
};
const host=value=>{
  const raw=String(value??'').trim();
  if(!raw)return '';
  try{return new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`).hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}
};
const hash=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex');

export function inferRadarChannel(value=''){
  const v=radarKey(value);
  if(v.includes('instagram'))return 'instagram';
  if(v.includes('liga')||v.includes('telefone')||v.includes('phone')||v.includes('call'))return 'phone';
  if(v.includes('mail'))return 'email';
  if(v.includes('indic'))return 'referral';
  if(v.includes('parce'))return 'partner';
  return 'other';
}

export function inferRadarAngle(value=''){
  const v=radarKey(value);
  if(v.includes('orcamento')||v.includes('follow'))return 'quote_followup';
  if(v.includes('reativ')||v.includes('retorno')||v.includes('deveria voltar')||v.includes('recorr'))return 'customer_reactivation';
  if(v.includes('ocioso')||v.includes('horario')||v.includes('agenda vazia'))return 'empty_schedule';
  if(v.includes('whatsapp')||v.includes('caos'))return 'whatsapp_chaos';
  if(v.includes('receita')||v.includes('dinheiro')||v.includes('oportunidade'))return 'revenue_visibility';
  return 'other';
}

export function radarIdentityKeys(lead={}){
  const keys=[];
  const place=String(lead.googlePlaceId??'').trim();
  const cnpj=String(lead.cnpj??'').replace(/\D/g,'');
  const phone=radarPhone(lead.phone);
  const domain=host(lead.website);
  const companyCity=`${radarKey(lead.businessName)}|${radarKey(lead.city)}`;
  if(place)keys.push(`place:${place}`);
  if(cnpj.length===14)keys.push(`cnpj:${cnpj}`);
  if(phone.length>=10)keys.push(`phone:${phone}`);
  if(domain)keys.push(`domain:${domain}`);
  if(companyCity!=='|')keys.push(`namecity:${companyCity}`);
  return [...new Set(keys)];
}

export function radarFingerprint(lead={}){
  const preferred=radarIdentityKeys(lead)[0]||`namecity:${radarKey(lead.businessName)}|${radarKey(lead.city)}`;
  return hash(preferred).slice(0,32);
}

export function radarRevisionHash(lead={}){
  const stable={
    businessName:lead.businessName||'',city:lead.city||'',segment:lead.segment||'',website:lead.website||'',phone:radarPhone(lead.phone),
    channelLabel:lead.channelLabel||'',fitSignals:lead.fitSignals||{},leadScore:Number(lead.leadScore)||0,className:lead.className||'',
    painHypothesis:lead.painHypothesis||'',suggestedAction:lead.suggestedAction||'',notes:lead.notes||'',cnpj:String(lead.cnpj||'').replace(/\D/g,''),
    googlePlaceId:lead.googlePlaceId||'',verifiedSource:lead.verifiedSource||'',verificationDate:lead.verificationDate||''
  };
  return hash(JSON.stringify(stable)).slice(0,40);
}

export function parseRadarRows(values=[]){
  if(!Array.isArray(values)||values.length<2)return [];
  const headers=(values[0]||[]).map(radarKey);
  const indexOf=(...names)=>headers.findIndex(h=>names.map(radarKey).includes(h));
  const idx={
    businessName:indexOf('Empresa'),city:indexOf('Cidade'),segment:indexOf('Segmento'),website:indexOf('Site / Instagram'),
    phone:indexOf('Telefone / contato'),channelLabel:indexOf('Canal inicial'),leadScore:indexOf('Lead Score'),className:indexOf('Classe'),
    painHypothesis:indexOf('Dor principal'),status:indexOf('Estágio'),suggestedAction:indexOf('Próxima ação'),nextContact:indexOf('Data próximo contato'),
    notes:indexOf('Observações'),cnpj:indexOf('CNPJ'),googlePlaceId:indexOf('Google Place ID'),verifiedSource:indexOf('Fonte verificada'),
    verificationDate:indexOf('Data verificação')
  };
  const signalIdx=Object.fromEntries(Object.entries(SIGNAL_HEADERS).map(([key,label])=>[key,indexOf(label)]));
  const cell=(row,i)=>i>=0?String(row?.[i]??'').trim():'';
  return values.slice(1).map((row,offset)=>{
    const fitSignals=Object.fromEntries(Object.entries(signalIdx).map(([key,i])=>[key,signal(cell(row,i))]));
    const lead={
      sourceRow:offset+2,
      businessName:cell(row,idx.businessName),city:cell(row,idx.city),segment:cell(row,idx.segment),website:cell(row,idx.website),
      phone:radarPhone(cell(row,idx.phone)),channelLabel:cell(row,idx.channelLabel),leadScore:Number(cell(row,idx.leadScore).replace(',','.'))||0,
      className:cell(row,idx.className),painHypothesis:cell(row,idx.painHypothesis),sourceStatus:cell(row,idx.status),
      suggestedAction:cell(row,idx.suggestedAction),nextContactDate:parseDate(cell(row,idx.nextContact)),notes:cell(row,idx.notes),
      cnpj:cell(row,idx.cnpj).replace(/\D/g,''),googlePlaceId:cell(row,idx.googlePlaceId),verifiedSource:cell(row,idx.verifiedSource),
      verificationDate:parseDate(cell(row,idx.verificationDate)),fitSignals
    };
    lead.channel=inferRadarChannel(lead.channelLabel);
    lead.angle=inferRadarAngle(`${lead.painHypothesis} ${lead.suggestedAction}`);
    lead.identityKeys=radarIdentityKeys(lead);
    lead.fingerprint=radarFingerprint(lead);
    lead.revisionHash=radarRevisionHash(lead);
    return lead;
  }).filter(lead=>lead.businessName.length>=2&&lead.city.length>=2&&lead.segment.length>=2);
}

function recencyScore(verificationDate,now=Date.now()){
  if(!verificationDate)return 35;
  const ms=Date.parse(`${verificationDate}T12:00:00Z`);
  if(!Number.isFinite(ms))return 35;
  const days=Math.max(0,(now-ms)/86400000);
  if(days<=14)return 100;
  if(days<=30)return 85;
  if(days<=60)return 65;
  if(days<=120)return 45;
  return 25;
}
function qualityScore(lead={}){
  const radar=lead.radar||{};
  let score=20;
  if(radar.verifiedSource)score+=20;
  if(radar.verificationDate)score+=15;
  if(radar.googlePlaceId)score+=20;
  if(radar.cnpj)score+=15;
  if(lead.phone||radar.phone)score+=5;
  if(radar.website)score+=5;
  return bounded(score);
}
function momentScore(lead={},now=Date.now()){
  if(['customer','no_fit'].includes(lead.status))return 0;
  const due=Date.parse(lead.nextContactAt||'');
  if(Number.isFinite(due)&&due<=now)return 100;
  if(lead.status==='replied')return 95;
  if(lead.status==='diagnostic')return 90;
  if(lead.status==='demo'||lead.status==='trial')return 85;
  if(lead.status==='follow_up')return 75;
  if(lead.status==='contacted')return 65;
  return 80;
}

export function growthAttackScore(lead={},options={}){
  const now=Number(options.now)||Date.now();
  const fit=bounded(lead.fitScore);
  const painQualified=Boolean(lead.painQualifiedAt)||Object.keys(lead.painSignals||{}).length>0;
  const pain=painQualified?bounded(lead.painScore):(lead.radar?.painHypothesis?55:lead.radar?.suggestedAction?45:35);
  const moment=momentScore(lead,now);
  const quality=qualityScore(lead);
  const recency=recencyScore(lead.radar?.verificationDate,now);
  const segment=bounded(options.segmentScore??50);
  const total=Math.round((fit*.35+pain*.25+moment*.15+quality*.10+recency*.05+segment*.10)*10)/10;
  const reasons=[];
  if(moment>=95)reasons.push('follow_up_due');
  if(fit>=90)reasons.push('very_high_fit'); else if(fit>=80)reasons.push('high_fit');
  if(painQualified&&pain>=70)reasons.push('confirmed_pain');
  else if(!painQualified&&lead.radar?.painHypothesis)reasons.push('pain_hypothesis');
  if(recency>=85)reasons.push('recently_verified');
  if(segment>=65)reasons.push('segment_performance');
  return {score:total,components:{fit,pain,moment,quality,recency,segment},painConfirmed:painQualified,reasons};
}

export function segmentLearningScores(leads=[],stageOf=()=>0){
  const groups=new Map();
  for(const lead of leads){
    const key=radarKey(lead.segment)||'unknown';
    if(!groups.has(key))groups.set(key,{key,label:lead.segment||'Outro',leads:0,replied:0,demos:0,customers:0});
    const g=groups.get(key),stage=Number(stageOf(lead))||0;
    g.leads++; if(stage>=2)g.replied++; if(stage>=4)g.demos++; if(stage>=6)g.customers++;
  }
  const total=[...groups.values()].reduce((a,g)=>({leads:a.leads+g.leads,customers:a.customers+g.customers}),{leads:0,customers:0});
  const baseline=total.leads?total.customers/total.leads:0;
  return [...groups.values()].map(g=>{
    const conversion=g.leads?g.customers/g.leads:0;
    const confidence=Math.min(1,g.leads/12);
    const relative=baseline>0?(conversion-baseline)*100:0;
    const score=Math.round(bounded(50+relative*confidence)*10)/10;
    return {...g,replyRate:g.leads?Math.round(g.replied/g.leads*1000)/10:0,demoRate:g.leads?Math.round(g.demos/g.leads*1000)/10:0,customerRate:g.leads?Math.round(g.customers/g.leads*1000)/10:0,learningScore:score};
  }).sort((a,b)=>b.learningScore-a.learningScore||b.leads-a.leads);
}
