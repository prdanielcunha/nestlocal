import {calendarAddDay} from './calendar.js';
const copies={
 pt:{title:'Google Agenda: sincronização nos dois sentidos (manual)',help:'Escolha um agendamento, conecte sua própria conta Google e revise antes de aplicar. Não funciona automaticamente com o app fechado. Só eventos privados de dia inteiro criados por este vínculo são alterados; nomes, telefone e endereço do cliente não são enviados.',request:'Agendamento carregado',review:'Conectar Google e revisar',fromApp:'Usar data do NestLocal no Google',fromGoogle:'Trazer data do Google para o NestLocal',app:'NestLocal',google:'Google Agenda',absent:'Evento ainda não criado',equal:'As datas estão iguais.',conflict:'Há alterações nos dois lados. Escolha explicitamente qual data deve prevalecer.',agree:'Revisei as datas. Ao trazer uma mudança, o período atual será mantido e a confirmação anterior do cliente será invalidada.',partial:'A data mudou no NestLocal, mas a atualização no Google não foi confirmada. Revise os dois lados antes de tentar novamente.',done:'Alteração aplicada. Revise novamente para conferir os dois lados.',failed:'Não foi possível sincronizar. Nenhuma conclusão de sincronização foi registrada. Revise novamente.',stale:'O agendamento ou evento mudou. Revise novamente antes de aplicar.',signin:'Entre no NestLocal pelo Google com a mesma conta antes de conectar a agenda.',provider:'O Google não autorizou a operação. Confira o consentimento e se a API Calendar está disponível no projeto. Nenhum serviço pago será ativado.',unsupported:'Este evento usa horário exato, recorrência, convidados ou foi excluído. Ele não será convertido automaticamente em agendamento por período.',busy:'Consultando os dois lados…',choose:'Escolha um agendamento',cancel:'Fechar revisão'},
 en:{title:'Google Calendar: two-way sync (manual)',help:'Choose an appointment, connect your own Google account and review before applying. This does not run automatically with the app closed. Only private all-day events created by this link are changed; customer names, phone and address are not sent.',request:'Loaded appointment',review:'Connect Google and review',fromApp:'Use NestLocal date in Google',fromGoogle:'Bring Google date into NestLocal',app:'NestLocal',google:'Google Calendar',absent:'Event not created yet',equal:'Dates match.',conflict:'Both sides changed. Explicitly choose which date to keep.',agree:'I reviewed the dates. Importing a change keeps the current date window and invalidates the previous customer confirmation.',partial:'The NestLocal date changed, but the Google update was not confirmed. Review both sides before retrying.',done:'Change applied. Review again to check both sides.',failed:'Could not sync. No successful sync was recorded. Review again.',stale:'The appointment or event changed. Review again before applying.',signin:'Sign in to NestLocal with the same Google account before connecting the calendar.',provider:'Google did not authorize the operation. Check consent and Calendar API availability in the project. No paid service will be enabled.',unsupported:'This event uses exact times, recurrence, guests or was deleted. It will not be automatically converted into a date-window appointment.',busy:'Checking both sides…',choose:'Choose an appointment',cancel:'Close review'},
 es:{title:'Google Calendar: sincronización bidireccional (manual)',help:'Elige una cita, conecta tu cuenta Google y revisa antes de aplicar. No funciona automáticamente con la app cerrada. Solo cambia eventos privados de día completo creados por este vínculo; no envía nombre, teléfono ni dirección del cliente.',request:'Cita cargada',review:'Conectar Google y revisar',fromApp:'Usar fecha de NestLocal en Google',fromGoogle:'Traer fecha de Google a NestLocal',app:'NestLocal',google:'Google Calendar',absent:'Evento aún no creado',equal:'Las fechas coinciden.',conflict:'Ambos lados cambiaron. Elige explícitamente qué fecha conservar.',agree:'Revisé las fechas. Importar un cambio mantiene la franja actual e invalida la confirmación anterior del cliente.',partial:'La fecha cambió en NestLocal, pero Google no confirmó la actualización. Revisa ambos lados antes de reintentar.',done:'Cambio aplicado. Revisa de nuevo para comprobar ambos lados.',failed:'No se pudo sincronizar. No se registró una sincronización exitosa. Revisa de nuevo.',stale:'La cita o el evento cambió. Revisa antes de aplicar.',signin:'Entra en NestLocal con la misma cuenta Google antes de conectar el calendario.',provider:'Google no autorizó la operación. Revisa el consentimiento y la disponibilidad de Calendar API. No se activará ningún servicio de pago.',unsupported:'Este evento usa hora exacta, recurrencia, invitados o fue eliminado. No se convertirá automáticamente en una cita por franja.',busy:'Consultando ambos lados…',choose:'Elige una cita',cancel:'Cerrar revisión'}
};
const revision=row=>Number.isSafeInteger(Number(row?.schedule?.revision))&&Number(row.schedule.revision)>0?Number(row.schedule.revision):row?.schedule?.date?1:0;
export function calendarSyncPlan(request,event,scope){
 if(!['scheduled','in_progress'].includes(request?.status)||!calendarAddDay(request?.schedule?.date,1))throw Error('CALENDAR_UNSUPPORTED');
 if(!event)return {type:'create',appDate:request.schedule.date,googleDate:null};
 const meta=event.extendedProperties?.private||{};
 if(meta.nlOrg!==scope.orgId||meta.nlUid!==scope.uid||meta.nlRequest!==request.id)throw Error('CALENDAR_UNSUPPORTED');
 const googleDate=event.start?.date;
 if(event.status==='cancelled'||event.start?.dateTime||event.recurrence?.length||event.attendees?.length||event.visibility!=='private'||!calendarAddDay(googleDate,1)||event.end?.date!==calendarAddDay(googleDate,1)||!event.etag)throw Error('CALENDAR_UNSUPPORTED');
 const appChanged=String(revision(request))!==meta.nlRevision||request.schedule.date!==meta.nlDate,
  googleChanged=googleDate!==meta.nlDate;
 return {type:request.schedule.date===googleDate?'equal':appChanged&&googleChanged?'conflict':googleChanged?'pull':'push',appDate:request.schedule.date,googleDate};
}
export async function calendarEventId({orgId,uid,requestId}){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['nestlocal-google-calendar-v1',orgId,uid,requestId])));
 return 'nl'+[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function googleEventBody(request,{orgId,uid}){
 const date=request?.schedule?.date;if(!calendarAddDay(date,1))throw Error('CALENDAR_UNSUPPORTED');
 return {summary:'NestLocal',description:'Confira o período e confirme os detalhes no NestLocal. / Check the date window and details in NestLocal.',visibility:'private',transparency:'opaque',start:{date},end:{date:calendarAddDay(date,1)},extendedProperties:{private:{nlOrg:orgId,nlUid:uid,nlRequest:request.id,nlRevision:String(revision(request)),nlDate:date}},reminders:{useDefault:true}};
}
export function renderGoogleCalendarSync({requests,lang='pt',allowed,esc}){
 if(!allowed||!requests.length)return '';const c=copies[lang]||copies.pt;
 return `<details class="card google-calendar-sync"><summary><strong>${c.title}</strong></summary><p class="help">${c.help}</p><label>${c.request}<select data-google-sync-request><option value="">${c.choose}</option>${requests.filter(row=>['scheduled','in_progress'].includes(row.status)&&calendarAddDay(row.schedule?.date,1)).map(row=>`<option value="${esc(row.id)}">${esc(row.schedule.date)} · ${esc(row.customer?.name||row.id)}</option>`).join('')}</select></label><button type="button" class="button small" data-google-sync-review>${c.review}</button><div data-google-sync-preview></div><p class="help" role="status" data-google-sync-status></p></details>`;
}
export function bindGoogleCalendarSync({root=document,orgId,uid,lang,api,esc,isCurrent,onSaved,authorize}){
 const host=root.querySelector('.google-calendar-sync');if(!host)return;const c=copies[lang]||copies.pt,q=selector=>host.querySelector(selector),select=q('[data-google-sync-request]'),review=q('[data-google-sync-review]'),panel=q('[data-google-sync-preview]'),status=q('[data-google-sync-status]');
 let token='',snapshot=null,busy=false;const active=()=>host.isConnected&&isCurrent(orgId,uid),scope={orgId,uid},path=id=>`/api/organizations/${encodeURIComponent(orgId)}/nestlocal/requests/${encodeURIComponent(id)}`;
 const reset=()=>{snapshot=null;token='';panel.replaceChildren()};select.onchange=reset;
 const observer=new MutationObserver(()=>{if(!active()){reset();observer.disconnect()}});observer.observe(document.body,{childList:true,subtree:true});
 const google=async(id,method='GET',body,etag)=>{
  if(!active()||!token)throw Error('CALENDAR_STALE');
  const response=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events'+(id?'/'+encodeURIComponent(id):'')+'?sendUpdates=none',{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(etag?{'If-Match':etag}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  if(method==='GET'&&response.status===404)return null;if([409,412].includes(response.status))throw Error('CALENDAR_STALE');if(!response.ok)throw Error('CALENDAR_PROVIDER_BLOCKED');return response.json();
 };
 const explain=error=>['CALENDAR_STALE','SCHEDULE_REVISION_CONFLICT'].includes(error.message)?c.stale:error.message==='CALENDAR_GOOGLE_SIGN_IN_REQUIRED'?c.signin:error.message==='CALENDAR_PROVIDER_BLOCKED'||error.code?.startsWith('auth/')?c.provider:error.message==='CALENDAR_UNSUPPORTED'?c.unsupported:c.failed;
 review.onclick=async()=>{
  if(busy||!select.value||!active())return;busy=true;review.disabled=true;select.disabled=true;reset();status.textContent=c.busy;
  try{
   token=await authorize(uid);if(!active())return;const id=select.value,request=(await api(path(id))).item;if(!active())return;
   const eventId=await calendarEventId({orgId,uid,requestId:id}),event=await google(eventId),plan=calendarSyncPlan(request,event,scope);if(!active())return;snapshot={request,event,eventId,plan};
   panel.innerHTML=`<p>${c.app}: <strong>${esc(plan.appDate)}</strong><br>${c.google}: <strong>${esc(plan.googleDate||c.absent)}</strong></p>${plan.type==='conflict'?`<p role="alert">${c.conflict}</p>`:''}${plan.type==='equal'?`<p>${c.equal}</p>`:`<label><input type="checkbox" data-google-sync-agree> ${c.agree}</label><button type="button" class="button small" data-google-sync-push>${c.fromApp}</button>${event?`<button type="button" class="button small" data-google-sync-pull>${c.fromGoogle}</button>`:''}`}<button type="button" class="button small" data-google-sync-cancel>${c.cancel}</button>`;status.textContent='';
   q('[data-google-sync-cancel]').onclick=reset;
   for(const direction of ['push','pull']){const button=q('[data-google-sync-'+direction+']');if(button)button.onclick=()=>void apply(direction)}
  }catch(error){if(active()){reset();status.textContent=explain(error)}}finally{busy=false;if(active()){review.disabled=false;select.disabled=false}}
 };
 const apply=async direction=>{
  if(busy||!snapshot||!q('[data-google-sync-agree]')?.checked||!active())return;busy=true;const chosen=snapshot;let appApplied=false;host.querySelectorAll('button,select,input').forEach(input=>input.disabled=true);
  try{
   const latest=(await api(path(chosen.request.id))).item;if(!active())return;
   if(revision(latest)!==revision(chosen.request)||latest.status!==chosen.request.status||latest.schedule?.date!==chosen.request.schedule.date)throw Error('CALENDAR_STALE');
   const current=await google(chosen.eventId);if((current?.etag||null)!==(chosen.event?.etag||null))throw Error('CALENDAR_STALE');
   calendarSyncPlan(latest,current,scope);
   if(direction==='pull'){
    if(!current)throw Error('CALENDAR_STALE');
    await api(path(latest.id),{method:'PATCH',body:JSON.stringify({scheduledDate:current.start.date,expectedScheduleRevision:revision(latest),expectedScheduleStatus:latest.status})});
    appApplied=true;if(!active())return;const saved=(await api(path(latest.id))).item;
    if(saved.schedule?.date!==current.start.date)throw Error('CALENDAR_STALE');
    await google(chosen.eventId,'PATCH',{extendedProperties:googleEventBody(saved,scope).extendedProperties},current.etag);
   }else if(current)await google(chosen.eventId,'PATCH',googleEventBody(latest,scope),current.etag);
   else await google(null,'POST',{id:chosen.eventId,...googleEventBody(latest,scope)});
   if(active()){reset();status.textContent=c.done;await onSaved(c.done)}
  }catch(error){if(active()){reset();status.textContent=appApplied?c.partial:explain(error)}}finally{busy=false;if(active())host.querySelectorAll('button,select,input').forEach(input=>input.disabled=false)}
 };
}
