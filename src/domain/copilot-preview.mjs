// Deterministic, zero-token preview. This is not AI; it never infers payment, dates or consent.
// Raw customer conversation is untrusted, cited as evidence only and never executed.
const locales={
 pt:{stage:'Etapa a confirmar',next:'Confirme os detalhes antes de preparar um orçamento.',questions:['Qual serviço precisa ser realizado?','Onde o serviço será feito?','Qual é a melhor data para conversar ou visitar?'],reply:'Olá! Recebi sua mensagem. Você pode me confirmar qual serviço precisa e a região de atendimento? Assim consigo orientar os próximos passos.',noMessage:'Ainda não foi registrada uma mensagem do cliente.'},
 en:{stage:'Stage needs confirmation',next:'Confirm the details before preparing a quote.',questions:['Which service is needed?','Where will the service take place?','What is a good date to discuss or visit?'],reply:'Hello! I received your message. Could you confirm the service you need and your area? I can then suggest the next steps.',noMessage:'No customer message was recorded.'},
 es:{stage:'Etapa por confirmar',next:'Confirma los detalles antes de preparar un presupuesto.',questions:['¿Qué servicio necesitas?','¿Dónde se realizará el servicio?','¿Qué fecha es mejor para hablar o visitar?'],reply:'¡Hola! Recibí tu mensaje. ¿Podrías confirmar qué servicio necesitas y en qué zona? Así podré orientarte sobre los próximos pasos.',noMessage:'Todavía no se registró un mensaje del cliente.'}
};
export function previewOpportunity(record,language='pt'){
  if(!record||typeof record!=='object')throw new TypeError('INVALID_OPPORTUNITY');
  const locale=locales[String(language).slice(0,2)]||locales.pt;
  const message=String(record.message||'').trim().slice(0,6000);
  const excerpt=message?message.slice(0,220):'';
  const known={origin:String(record.origin||'other').slice(0,30),
    customerName:String(record.customerName||'').slice(0,100),
    serviceSummary:String(record.serviceSummary||'').slice(0,240)};
  return {mode:'deterministic',authority:'suggestion_only',stage:{label:locale.stage,verified:false},
    facts:excerpt?[{value:excerpt,sourceField:'message',evidence:excerpt,verified:false}]:[],
    known,questions:locale.questions.slice(0,3),nextAction:locale.next,
    replyDraft:locale.reply,delivered:false,customerContacted:false,
    priceApproved:false,appointmentBooked:false,consentVerified:false,
    notice:message?locale.next:locale.noMessage};
}
