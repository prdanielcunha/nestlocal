function firstName(name=''){
  const value=String(name||'').trim();
  return value.split(/\s+/)[0]||'';
}

function formatDate(value,lang){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '';
  const [y,m,d]=String(value).split('-');
  return lang==='en'?m+'/'+d+'/'+y:d+'/'+m+'/'+y;
}

function safeMoney(formatMoney,value){
  const amount=Math.max(0,Number(value||0));
  return amount>0?formatMoney(amount):'';
}

export function officialMessageReadiness(action,settings={}){
  const messaging=settings.messaging||{},templates=messaging.templates||{};
  if(!['followup','reactivate'].includes(action?.type))return{supported:false,ready:false,reason:'UNSUPPORTED'};
  if(action.whatsappAllowed!==true)return{supported:true,ready:false,reason:'WHATSAPP_OPT_IN_REQUIRED'};
  const templateName=action.type==='followup'?String(templates.serviceUpdate||'').trim():String(templates.maintenanceReminder||'').trim();
  if(!templateName)return{supported:true,ready:false,reason:'MESSAGE_TEMPLATE_REQUIRED'};
  if(messaging.connected!==true)return{supported:true,ready:false,reason:'MESSAGING_PROVIDER_NOT_CONNECTED',templateName};
  return{supported:true,ready:true,reason:'',templateName};
}

export function buildActionPlaybook({
  action,
  lang='pt',
  businessName='',
  serviceLabel='',
  formatMoney=(value)=>String(value),
}){
  if(!action||!['followup','collect','reactivate'].includes(action.type))return null;
  const locale=['pt','en','es'].includes(lang)?lang:'pt';
  const name=firstName(action.customerName);
  const service=String(serviceLabel||action.serviceLabel||'').trim();
  const amount=safeMoney(formatMoney,action.amount);
  const date=formatDate(action.dueDate,locale);
  const hours=Math.max(48,Number(action.ageHours||48));
  const facts=[];

  if(action.type==='followup'){
    facts.push({key:'fact_quote_wait',value:String(hours)});
    if(amount)facts.push({key:'fact_quote_amount',value:amount});
    if(service)facts.push({key:'fact_service',value:service});
    const message=locale==='en'
      ? `Hi${name?', '+name:''}! Just following up on the quote${service?' for '+service:''}${amount?' ('+amount+')':''}. If you have any questions or want to organize the next step, I’m here to help.`
      : locale==='es'
        ? `¡Hola${name?', '+name:''}! Te escribo para dar seguimiento al presupuesto${service?' de '+service:''}${amount?' ('+amount+')':''}. Si tienes alguna duda o quieres organizar el próximo paso, estoy a disposición.`
        : `Oi${name?', '+name:''}! Passando para acompanhar o orçamento${service?' de '+service:''}${amount?' ('+amount+')':''}. Se ficou alguma dúvida ou quiser organizar o próximo passo, estou à disposição.`;
    return{type:action.type,message,facts,whatsappAllowed:action.whatsappAllowed===true,phone:String(action.phone||'')};
  }

  if(action.type==='collect'){
    if(amount)facts.push({key:'fact_receivable',value:amount});
    if(service)facts.push({key:'fact_service',value:service});
    const message=locale==='en'
      ? `Hi${name?', '+name:''}! Our records show an outstanding balance${amount?' of '+amount:''}${service?' for '+service:''}. If payment has already been made, please disregard this message and let us know.`
      : locale==='es'
        ? `¡Hola${name?', '+name:''}! En nuestro control figura un saldo pendiente${amount?' de '+amount:''}${service?' del servicio '+service:''}. Si el pago ya fue realizado, puedes ignorar este mensaje y avisarnos.`
        : `Oi${name?', '+name:''}! No nosso controle ficou um saldo pendente${amount?' de '+amount:''}${service?' referente ao serviço de '+service:''}. Se o pagamento já foi realizado, pode desconsiderar esta mensagem e nos avisar.`;
    return{type:action.type,message,facts,whatsappAllowed:false,phone:String(action.phone||'')};
  }

  facts.push({key:'fact_return_due',value:date||String(action.dueDate||'')});
  if(service)facts.push({key:'fact_service',value:service});
  const message=locale==='en'
    ? `Hi${name?', '+name:''}! According to our schedule, it is time to consider your next${service?' '+service:''} service${date?' since '+date:''}. If it makes sense, I can help check the next available times.`
    : locale==='es'
      ? `¡Hola${name?', '+name:''}! Según nuestra programación, ya llegó el momento de considerar tu próximo servicio${service?' de '+service:''}${date?' desde '+date:''}. Si te parece bien, puedo ayudarte a revisar los próximos horarios.`
      : `Oi${name?', '+name:''}! Pela nossa programação, chegou a hora de considerar seu próximo serviço${service?' de '+service:''}${date?' desde '+date:''}. Se fizer sentido, posso ajudar a verificar os próximos horários.`;
  return{type:action.type,message,facts,whatsappAllowed:action.whatsappAllowed===true,phone:String(action.phone||'')};
}

export function assistActionKey(action){
  return `${action?.type||''}:${action?.requestId||action?.customerId||''}`;
}
