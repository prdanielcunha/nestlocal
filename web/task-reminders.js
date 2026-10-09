// Local, opt-in reminders: active-app only. No push subscription, backend send or contact PII.
export function dueTaskDigest(tasks,today,nextDay){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(today||''))||!/^\d{4}-\d{2}-\d{2}$/.test(String(nextDay||'')))return {due:0,tomorrow:0};
 let due=0,tomorrow=0;
 for(const item of Array.isArray(tasks)?tasks:[]){
  if(!item||item.status!=='open'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(item.dueDate||'')))continue;
  if(item.dueDate<=today)due++;
  else if(item.dueDate===nextDay)tomorrow++;
 }
 return {due,tomorrow};
}
export function makeTaskNotification(digest,locale='pt'){
 const counts=Object.freeze({due:Math.max(0,Number(digest?.due)||0),tomorrow:Math.max(0,Number(digest?.tomorrow)||0)});
 if(counts.due===0&&counts.tomorrow===0)return null;
 const language=String(locale).slice(0,2);
 const translations={
  pt:{title:'NestLocal · Retornos',due:'retorno(s) para revisar hoje',tomorrow:'retorno(s) previsto(s) para amanhã'},
  en:{title:'NestLocal · Follow-ups',due:'follow-up(s) to review today',tomorrow:'follow-up(s) due tomorrow'},
  es:{title:'NestLocal · Seguimientos',due:'seguimiento(s) para revisar hoy',tomorrow:'seguimiento(s) previsto(s) para mañana'}
 };
 const t=translations[language]||translations.pt;
 return {title:t.title,body:[counts.due?`${counts.due} ${t.due}`:'',counts.tomorrow?`${counts.tomorrow} ${t.tomorrow}`:''].filter(Boolean).join(' · '),
  delivery:'active_app_only',containsCustomerData:false,channels:['device_notification']};
}
