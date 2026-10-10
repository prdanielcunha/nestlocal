// Pilot F3: explicit operator opt-in, minimum necessary external processing,
// source-bound claims, zero authority to book, quote, bill or send.
const clean=(x,max)=>typeof x==='string'?x.trim().slice(0,max):'';
const textual=(x)=>clean(x,6000).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function redactOpportunityForAi(value){
 if(typeof value!=='string')throw new TypeError('INVALID_AI_SOURCE');
 const clipped=value.slice(0,2500);
 if(!clipped.trim())throw new TypeError('AI_SOURCE_REQUIRED');
 return clipped
   .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[email]')
   .replace(/\b(?:https?:\/\/|www\.)\S+/gi,'[url]')
   .replace(/(?:\+?\d[\s().-]?){10,15}/g,'[telefone]')
   .replace(/\b\d{3}\.\d{3}\.\d{3}-?\d{2}\b/g,'[documento]')
   .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-?\d{2}\b/g,'[documento]')
   .trim();
}
export function pilotOpportunityAiEnabled(organizationId,env=process.env){
 if(env.NESTLOCAL_AI_V2_ENABLED!=='true'||env.NESTLOCAL_OPPORTUNITY_AI_V2_ENABLED!=='true')return false;
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(organizationId||''))return false;
 return String(env.NESTLOCAL_OPPORTUNITY_AI_PILOT_ORGS||'').split(',').map(s=>s.trim()).filter(Boolean).includes(organizationId);
}
export function maxDailyAiRequests(env=process.env){
 const value=Number(env.NESTLOCAL_OPPORTUNITY_AI_DAILY_CAP||8);
 return Number.isSafeInteger(value)?Math.max(1,Math.min(25,value)):8;
}
function verifyPeriod(period,source){
 const token={morning:['manha','morning','mañana'],afternoon:['tarde','afternoon'],evening:['noite','evening','noche']}[period];
 const text=textual(source);
 return Array.isArray(token)&&token.some(x=>text.includes(textual(x)))?period:null;
}
function sourceContains(source,claim){
 const normalized=textual(source),needle=textual(claim);
 return needle.length>=3&&normalized.includes(needle);
}
export function projectNestAiOpportunityExtraction(raw,redactedSource,language='pt'){
 const input=typeof raw==='string'?JSON.parse(raw):raw;
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('NESTAI_SCHEMA_INVALID');
 if(typeof input.intent!=='string'||!Array.isArray(input.missingFields))throw Error('NESTAI_SCHEMA_INVALID');
 const service=typeof input.service==='string'&&sourceContains(redactedSource,input.service)
   ?clean(input.service,120):null;
 const preferredDate=typeof input.preferredDate==='string'&&
   /^\d{4}-\d{2}-\d{2}$/.test(input.preferredDate)&&
   redactedSource.includes(input.preferredDate)?input.preferredDate:null;
 const preferredPeriod=verifyPeriod(input.preferredPeriod,redactedSource);
 const locale=String(language).toLowerCase().slice(0,2);
 const labels={
  pt:{questions:['Qual serviço você precisa?', 'Em qual cidade ou região será o atendimento?', 'Quando seria conveniente conversar sobre a visita?'],
      summary:'A extração identificou um possível serviço. Confirme os dados antes de criar um pedido.'},
  en:{questions:['What service is needed?','Which area should we serve?','When would be a good time to discuss a visit?'],
      summary:'The extraction found a possible service. Confirm the details before creating a request.'},
  es:{questions:['¿Qué servicio necesitas?','¿En qué zona será el servicio?','¿Cuándo te conviene hablar de una visita?'],
      summary:'La extracción encontró un posible servicio. Confirma los detalles antes de crear una solicitud.'}
 };
 const copy=labels[locale]||labels.pt;
 return {mode:'nestai',authority:'suggestion_only',kind:'extraction',
    claims:service?[{field:'service',value:service,evidence:service,sourceField:'message',verified:false}]:[],
    preferredDate,preferredPeriod,questions:copy.questions,
    summary:copy.summary,reviewRequired:true,delivery:false,
    bookingConfirmed:false,priceCalculated:false,whatsappConnected:false,
    piiRedacted:true};
}
