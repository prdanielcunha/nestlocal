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


const OUTREACH_COPY={
  pt:{
    quote_followup:name=>`Oi! Tudo bem? Estou conhecendo melhor operações como a ${name}. Posso te fazer uma pergunta rápida? Quando entra um orçamento pelo WhatsApp e o cliente não responde, vocês conseguem ver facilmente quem precisa de retorno? O NestLocal organiza orçamento, agenda e retorno sem tirar o WhatsApp do processo. Se fizer sentido, te mostro em poucos minutos.`,
    customer_reactivation:name=>`Oi! Tudo bem? Estou conhecendo melhor operações como a ${name}. Hoje vocês conseguem enxergar facilmente quais clientes já estão no momento de voltar para um novo serviço ou manutenção? O NestLocal organiza esses retornos junto com orçamento e agenda, sem virar um ERP pesado. Se fizer sentido, te mostro em poucos minutos.`,
    empty_schedule:name=>`Oi! Tudo bem? Estou conhecendo melhor operações como a ${name}. Quando aparece um horário vazio na agenda, vocês conseguem identificar rápido quais orçamentos ou clientes podem preencher essa janela? O NestLocal liga agenda, orçamento e retorno para ajudar nisso. Se fizer sentido, te mostro em poucos minutos.`,
    whatsapp_chaos:name=>`Oi! Tudo bem? Estou conhecendo melhor operações como a ${name}. Quando pedidos, orçamentos e retornos chegam pelo WhatsApp, vocês conseguem manter tudo organizado sem perder acompanhamento? O NestLocal foi feito para organizar esse fluxo mantendo o WhatsApp no centro. Se fizer sentido, te mostro em poucos minutos.`,
    revenue_visibility:name=>`Oi! Tudo bem? Estou conhecendo melhor operações como a ${name}. Hoje vocês conseguem ver rapidamente o que entrou, foi orçado, aprovado e ainda precisa de retorno? O NestLocal organiza essa visão de receita junto da operação. Se fizer sentido, te mostro em poucos minutos.`,
    other:name=>`Oi! Tudo bem? Estou conhecendo melhor operações como a ${name}. Queria entender como vocês organizam hoje orçamento, agenda e retorno de clientes sem perder oportunidades no WhatsApp. O NestLocal foi feito justamente para conectar esse fluxo. Se fizer sentido, te mostro em poucos minutos.`
  },
  en:{
    quote_followup:name=>`Hi! I'm learning more about businesses like ${name}. Quick question: when a quote comes through WhatsApp and the customer stops replying, can you easily see who needs a follow-up? NestLocal connects quotes, scheduling and follow-up without taking WhatsApp out of the process. If useful, I can show you in a few minutes.`,
    customer_reactivation:name=>`Hi! I'm learning more about businesses like ${name}. Can you easily see which customers are due to come back for another service or maintenance visit? NestLocal connects those return opportunities with quotes and scheduling without becoming a heavy ERP. If useful, I can show you in a few minutes.`,
    empty_schedule:name=>`Hi! I'm learning more about businesses like ${name}. When an empty slot appears in the schedule, can you quickly see which quote or returning customer could fill it? NestLocal connects scheduling, quotes and follow-up to make that easier. If useful, I can show you in a few minutes.`,
    whatsapp_chaos:name=>`Hi! I'm learning more about businesses like ${name}. When requests, quotes and follow-ups arrive through WhatsApp, can you keep everything organized without losing track? NestLocal was built to organize that flow while keeping WhatsApp at the center. If useful, I can show you in a few minutes.`,
    revenue_visibility:name=>`Hi! I'm learning more about businesses like ${name}. Can you quickly see what came in, what was quoted, approved and still needs follow-up? NestLocal connects that revenue view with the day-to-day operation. If useful, I can show you in a few minutes.`,
    other:name=>`Hi! I'm learning more about businesses like ${name}. I'd like to understand how you currently organize quotes, scheduling and customer follow-up without losing opportunities in WhatsApp. NestLocal was built to connect that flow. If useful, I can show you in a few minutes.`
  },
  es:{
    quote_followup:name=>`¡Hola! Estoy conociendo mejor operaciones como ${name}. Una pregunta rápida: cuando llega un presupuesto por WhatsApp y el cliente deja de responder, ¿pueden ver fácilmente quién necesita seguimiento? NestLocal conecta presupuestos, agenda y seguimiento sin sacar WhatsApp del proceso. Si tiene sentido, te lo muestro en pocos minutos.`,
    customer_reactivation:name=>`¡Hola! Estoy conociendo mejor operaciones como ${name}. ¿Pueden ver fácilmente qué clientes ya deberían volver para un nuevo servicio o mantenimiento? NestLocal conecta esos retornos con presupuestos y agenda sin convertirse en un ERP pesado. Si tiene sentido, te lo muestro en pocos minutos.`,
    empty_schedule:name=>`¡Hola! Estoy conociendo mejor operaciones como ${name}. Cuando aparece un horario vacío, ¿pueden identificar rápido qué presupuesto o cliente podría ocuparlo? NestLocal conecta agenda, presupuestos y seguimiento para facilitarlo. Si tiene sentido, te lo muestro en pocos minutos.`,
    whatsapp_chaos:name=>`¡Hola! Estoy conociendo mejor operaciones como ${name}. Cuando pedidos, presupuestos y seguimientos llegan por WhatsApp, ¿pueden mantener todo organizado sin perder oportunidades? NestLocal organiza ese flujo manteniendo WhatsApp en el centro. Si tiene sentido, te lo muestro en pocos minutos.`,
    revenue_visibility:name=>`¡Hola! Estoy conociendo mejor operaciones como ${name}. ¿Pueden ver rápidamente lo que entró, fue presupuestado, aprobado y todavía necesita seguimiento? NestLocal conecta esa visión de ingresos con la operación diaria. Si tiene sentido, te lo muestro en pocos minutos.`,
    other:name=>`¡Hola! Estoy conociendo mejor operaciones como ${name}. Quería entender cómo organizan hoy presupuestos, agenda y seguimiento de clientes sin perder oportunidades en WhatsApp. NestLocal fue creado para conectar ese flujo. Si tiene sentido, te lo muestro en pocos minutos.`
  }
};

export function growthOutreachMessage(lead={},lang='pt'){
  const locale=['pt','en','es'].includes(lang)?lang:'pt';
  const name=String(lead.businessName||'sua empresa').trim().slice(0,120)||'sua empresa';
  const angle=String(lead.radar?.recommendedAngle||lead.acquisition?.angle||'other');
  const pack=OUTREACH_COPY[locale];
  return (pack[angle]||pack.other)(name);
}

export function growthAttackTrend(lead={},currentScore=0){
  const current=bounded(currentScore);
  const baseline=Number(lead.radar?.attackBaselineScore);
  const previous=Number(lead.radar?.previousAttackScore);
  const from=Number.isFinite(baseline)?baseline:Number.isFinite(previous)?previous:current;
  const delta=Math.round((current-from)*10)/10;
  return {delta,direction:delta>=2?'up':delta<=-2?'down':'stable',baseline:Math.round(from*10)/10};
}
