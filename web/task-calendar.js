// Opt-in calendar export for an operator's own dated task. No customer PII.
// ICS is one-way; reminders depend on the user's calendar app and OS settings.
const validDate=value=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
 const parsed=new Date(value+'T00:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
};
function nextDay(value){const d=new Date(value+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
const formatDate=d=>d.replace(/-/g,'');
function zoneValid(zone){
 if(!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+){0,3}$/.test(zone||''))return false;
 try{new Intl.DateTimeFormat('en',{timeZone:zone});return true}catch{return false}
}
export function makeTaskReminderIcs(task,{issuedAt=new Date(),locale='pt'}={}){
 if(!task||!/^[A-Za-z0-9_-]{1,128}$/.test(String(task.id||''))||!validDate(task.dueDate)||!zoneValid(task.timezone))
   return null;
 const time=String(task.dueTime||'');
 if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
 const labels={
  pt:{title:'NestLocal · Lembrar retorno',detail:'Retorno registrado manualmente no NestLocal. Confira os detalhes no aplicativo.',alert:'Lembrete NestLocal'},
  en:{title:'NestLocal · Follow-up reminder',detail:'Follow-up recorded manually in NestLocal. Check the app for details.',alert:'NestLocal reminder'},
  es:{title:'NestLocal · Recordar seguimiento',detail:'Seguimiento guardado manualmente en NestLocal. Revisa los detalles en la aplicación.',alert:'Recordatorio NestLocal'}
 };
 const l=labels[String(locale).slice(0,2)]||labels.pt,stamp=new Date(issuedAt);
 if(!Number.isFinite(stamp.getTime()))return null;
 const dtstamp=stamp.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','CALSCALE:GREGORIAN',
  'PRODID:-//MillionsNest//NestLocal Task Calendar//PT',
  'METHOD:PUBLISH','BEGIN:VEVENT',
  'UID:'+task.id+'@tasks.nestlocal.millionsnest.com','DTSTAMP:'+dtstamp,
  'SEQUENCE:'+Math.max(0,Math.min(2147483647,Number.isSafeInteger(task.version)?task.version:0)),
  'SUMMARY:'+l.title,'DESCRIPTION:'+l.detail,'STATUS:TENTATIVE',
  'TRANSP:TRANSPARENT'];
 if(time){
  lines.push('DTSTART;TZID='+task.timezone+':'+formatDate(task.dueDate)+'T'+time.replace(':','')+'00','DURATION:PT30M');
 }else{
  lines.push('DTSTART;VALUE=DATE:'+formatDate(task.dueDate),
   'DTEND;VALUE=DATE:'+formatDate(nextDay(task.dueDate)));
 }
 lines.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+l.alert,
  'TRIGGER:-PT1H','END:VALARM','END:VEVENT','END:VCALENDAR');
 return lines.join('\r\n')+'\r\n';
}
