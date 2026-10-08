// Calendar UI contract. Never synchronizes appointments back from third-party calendars.
// Browser only: no data is written outside deliberate user interaction.
export const calendarWords={
  pt:{
    title:'Sua agenda, com lembretes',sub:'Agendamentos do NestLocal podem aparecer no calendário que você já usa. Sem conectar WhatsApp.',
    today:'Visitas hoje',tomorrow:'Visitas amanhã',none:'Tudo em dia',noneText:'Nenhuma visita hoje ou amanhã.',
    important:'Ao receber um novo agendamento, confira os horários na agenda interna.',
    subscribe:'Sincronizar com minha agenda',subscribeNote:'Assine o calendário: novas visitas e mudanças podem aparecer automaticamente, conforme a frequência de atualização do seu aplicativo de agenda. Somente leitura.',
    create:'Gerar link de assinatura',rotate:'Gerar novo link (substitui o anterior)',revoke:'Revogar calendário',copied:'Link copiado. Adicione pela opção Assinar / Calendário por URL no seu aplicativo de agenda.',
    copy:'Copiar link do calendário',open:'Abrir assinatura no celular',shareWarning:'Este link é privado: quem o possuir poderá consultar o resumo dos seus serviços agendados. Não o compartilhe.',
    privacy:'A assinatura omite dados pessoais dos clientes e pode ser revogada a qualquer momento.',
    alarms:'Os eventos incluem lembretes para 1 dia antes e no próprio dia. Seu aplicativo de agenda decide como mostrar as notificações.',
    add:'Adicionar à agenda',google:'Google Agenda',file:'Apple / Outlook / .ics',saved:'Evento gerado. Confira os avisos no seu calendário.',
    notRealtime:'Assinatura de mão única: mudanças feitas fora do NestLocal não voltam para cá. Atualização depende do seu calendário.',
    future:'Próximos compromissos',noPush:'Aviso externo não é enviado pelo NestLocal: use os alarmes do seu calendário.',
    status:'Assinatura ativa',inactive:'Assinatura não configurada',revoked:'Assinatura revogada.',error:'Não foi possível acessar a agenda. Tente novamente.',
    install:'Para receber alertas com o app fechado, ative notificações no seu calendário (Google/Apple/Outlook). O NestLocal ainda não envia push autônomo.',
    note:'Datas por período (manhã/tarde/noite): a agenda mostra evento de dia inteiro. Confirme a hora exata no NestLocal.'
  },
  en:{
    title:'Your calendar, with reminders',sub:'NestLocal jobs can appear in the calendar you already use. No WhatsApp required.',
    today:'Jobs today',tomorrow:'Jobs tomorrow',none:'All clear',noneText:'No jobs today or tomorrow.',
    important:'Check exact times in the NestLocal internal schedule.',
    subscribe:'Subscribe to my calendar',subscribeNote:'Calendar subscriptions bring updated jobs to your personal calendar at intervals controlled by the calendar app. Read only.',
    create:'Create subscription link',rotate:'Generate replacement link',revoke:'Revoke calendar feed',copied:'Link copied. Use Subscribe / Add calendar by URL in your calendar app.',
    copy:'Copy subscription link',open:'Open calendar subscription',shareWarning:'Keep this link private. Anyone with it may read limited service appointment information.',
    privacy:'No customer personal data is included and the link is revocable.',
    alarms:'Events include next-day and same-day alerts. Your calendar app controls notification behavior.',
    add:'Add to calendar',google:'Google Calendar',file:'Apple / Outlook / .ics',saved:'Event generated. Confirm alerts in your calendar.',
    notRealtime:'One-way sync: edits outside NestLocal do not sync back. Refresh frequency depends on your calendar.',
    future:'Upcoming appointments',noPush:'NestLocal does not send external alerts. Use your calendar notifications.',
    status:'Subscription active',inactive:'Not subscribed',revoked:'Subscription revoked.',error:'Calendar unavailable. Try again.',
    install:'Enable calendar notifications for alerts while NestLocal is closed. Standalone NestLocal push is not yet active.',
    note:'Date windows (morning/afternoon/evening) are all-day events. Check exact time in NestLocal.'
  },
  es:{
    title:'Tu agenda, con recordatorios',sub:'Los servicios de NestLocal aparecen en tu calendario habitual. No necesitas WhatsApp.',
    today:'Servicios hoy',tomorrow:'Servicios mañana',none:'Todo al día',noneText:'Sin visitas hoy ni mañana.',
    important:'Confirma la hora exacta en NestLocal.',
    subscribe:'Sincronizar con mi agenda',subscribeNote:'Suscríbete para recibir cambios según la frecuencia de actualización de tu calendario. Solo lectura.',
    create:'Generar enlace de suscripción',rotate:'Generar otro enlace',revoke:'Revocar calendario',copied:'Enlace copiado. Usa la opción Suscribirse / Añadir por URL de tu calendario.',
    copy:'Copiar enlace',open:'Abrir suscripción',shareWarning:'Mantén privado este enlace: quien lo posea puede consultar las citas resumidas.',
    privacy:'No incluye datos personales de clientes y se puede revocar.',
    alarms:'Los eventos incluyen avisos el día anterior y el mismo día, según compatibilidad del calendario.',
    add:'Agregar a agenda',google:'Google Calendar',file:'Apple / Outlook / .ics',saved:'Evento generado. Revisa los avisos en tu calendario.',
    notRealtime:'Sincronización de una vía: editar fuera de NestLocal no actualiza el sistema.',
    future:'Próximos servicios',noPush:'NestLocal no envía avisos externos. Usa las notificaciones del calendario.',
    status:'Suscripción activa',inactive:'Sin configurar',revoked:'Suscripción revocada.',error:'Agenda no disponible.',
    install:'Habilita las notificaciones del calendario para avisos con NestLocal cerrado; push propio todavía no está activo.',
    note:'La fecha con franja horaria se guarda como evento de día completo. Confirma la hora exacta en NestLocal.'
  }
};
export const cw=(locale,key)=>calendarWords[locale]?.[key]||calendarWords.pt[key]||key;
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
export function calendarAddDay(iso,days){
  if(!dateRe.test(String(iso||''))||!Number.isSafeInteger(days))return null;
  const date=new Date(iso+'T00:00:00Z');
  if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==iso)return null;
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
export function calendarDigest(requests,today){
  const tomorrow=calendarAddDay(today,1);
  const set=Array.isArray(requests)?requests:[];
  const jobs=set.filter(r=>['scheduled','in_progress'].includes(r?.status)&&dateRe.test(r?.schedule?.date||''));
  return {today:jobs.filter(r=>r.schedule.date===today),tomorrow:jobs.filter(r=>r.schedule.date===tomorrow),
    next:jobs.filter(r=>r.schedule.date>=today).sort((a,b)=>a.schedule.date.localeCompare(b.schedule.date)).slice(0,12)};
}
function escapeIcs(v){return String(v||'').replace(/[\r\n]/g,' ').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').slice(0,140)}
function day(iso){return iso?.replace(/-/g,'')||''}
export function makeCalendarIcs(r,{service='Serviço'}={}){
  const date=r?.schedule?.date;
  const next=calendarAddDay(date,1);
  if(!next||!r?.id)return null;
  const label=escapeIcs('NestLocal - '+service+' ('+(r.schedule.window||'flexible')+')');
  const uid=String(r.id).replace(/[^A-Za-z0-9_-]/g,'').slice(0,70)+'@nestlocal.millionsnest.com';
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MillionsNest//NestLocal Calendar//PT','CALSCALE:GREGORIAN',
    'BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),
    'DTSTART;VALUE=DATE:'+day(date),'DTEND;VALUE=DATE:'+day(next),'SUMMARY:'+label,
    'DESCRIPTION:Confira o periodo e horario exatos no NestLocal.','STATUS:CONFIRMED',
    'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Servico amanha','TRIGGER:-P1D','END:VALARM',
    'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Servico hoje','TRIGGER:PT9H','END:VALARM',
    'END:VEVENT','END:VCALENDAR'];
  return lines.join('\r\n')+'\r\n';
}
export function makeGoogleCalendarUrl(r,{service='Serviço'}={}){
  const date=r?.schedule?.date,next=calendarAddDay(date,1);
  if(!next)return '';
  const qs=new URLSearchParams({action:'TEMPLATE',text:'NestLocal · '+service,
    dates:day(date)+'/'+day(next),details:'Compromisso registrado no NestLocal. Confira o período e o horário exatos no app. Configure os avisos de sua preferência no Google Agenda.'});
  return 'https://calendar.google.com/calendar/r/eventedit?'+qs.toString();
}
export function renderCalendarIntro({requests,locale='pt',today,esc=x=>x,active=false,hasLink=false}={}){
  const d=calendarDigest(requests,today),c=k=>cw(locale,k);
  const short=r=>'<li><strong>'+esc(r.schedule.date)+'</strong><span>'+esc(r.customer?.name||r.id||'')+'</span><button type="button" data-calendar-ics="'+esc(r.id)+'">'+c('add')+'</button></li>';
  const status=active?c('status'):c('inactive');
  return '<article class="card calendar-connect"><div class="calendar-intro-top"><div><span class="eyebrow">NESTLOCAL / CALENDAR</span><h2>'+c('title')+'</h2><p class="help">'+c('sub')+'</p></div><span class="tag">'+status+'</span></div>'+
    '<div class="calendar-due"><div><strong>'+d.today.length+'</strong><span>'+c('today')+'</span></div><div><strong>'+d.tomorrow.length+'</strong><span>'+c('tomorrow')+'</span></div></div>'+
    (d.today.length||d.tomorrow.length?'<ul class="calendar-due-list">'+[...d.today,...d.tomorrow].slice(0,5).map(short).join('')+'</ul>':'<p class="help">'+c('noneText')+'</p>')+
    '<details class="calendar-sync-settings"><summary>'+c('subscribe')+'</summary><p class="help">'+c('subscribeNote')+'</p>'+
    '<div class="calendar-sync-actions"><button class="button primary small" data-calendar-feed-create>'+c(active?'rotate':'create')+'</button>'+
    (active?'<button class="button small" data-calendar-feed-revoke>'+c('revoke')+'</button>':'')+
    (hasLink?'<button class="button small" data-calendar-feed-copy>'+c('copy')+'</button><button class="button small" data-calendar-feed-open>'+c('open')+'</button>':'')+'</div>'+
    '<p class="help">'+c('privacy')+' '+c('shareWarning')+'</p></details>'+
    '<p class="help calendar-reminder-disclosure">'+c('alarms')+' '+c('notRealtime')+' '+c('note')+'</p></article>';
}
