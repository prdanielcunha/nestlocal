// Manual follow-up tasks. Date/time are local calendar values, not a push promise.
export const TASK_SCHEMA_VERSION=2;
const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
function calendarDate(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false;
  const date=new Date(iso+'T00:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso;
}
function validZone(zone){try{new Intl.DateTimeFormat('en',{timeZone:zone});return true}catch{return false}}
export function normalizeActionTask(body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new TypeError('INVALID_TASK');
  const allowed=new Set(['title','note','dueDate','dueTime','timezone','sourceDraftId']);
  if(Object.keys(body).some(k=>!allowed.has(k)))throw new TypeError('INVALID_TASK_FIELDS');
  const title=clean(body.title,140),note=clean(body.note,500),
    dueDate=clean(body.dueDate,10),dueTime=clean(body.dueTime,5),
    timezone=clean(body.timezone,64),sourceDraftId=clean(body.sourceDraftId,128);
  if(title.length<3)throw new TypeError('TASK_TITLE_REQUIRED');
  if(!calendarDate(dueDate))throw new TypeError('INVALID_TASK_DATE');
  if(dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime))throw new TypeError('INVALID_TASK_TIME');
  if(!timezone||!validZone(timezone))throw new TypeError('INVALID_TASK_TIMEZONE');
  if(sourceDraftId&&!/^[A-Za-z0-9_-]{1,128}$/.test(sourceDraftId))throw new TypeError('INVALID_TASK_SOURCE');
  return {schemaVersion:TASK_SCHEMA_VERSION,title,note,dueDate,dueTime,timezone,sourceDraftId};
}
export function normalizeActionTaskPatch(body,record){
  if(!body||typeof body!=='object'||Array.isArray(body)||!record||record.status!=='open')
    throw new TypeError('TASK_NOT_EDITABLE');
  const allowed=new Set(['expectedVersion','status','title','note','dueDate','dueTime','timezone']);
  if(Object.keys(body).some(k=>!allowed.has(k)))throw new TypeError('INVALID_TASK_FIELDS');
  if(!Number.isSafeInteger(body.expectedVersion)||record.version!==body.expectedVersion)
    throw new TypeError('TASK_VERSION_CONFLICT');
  if(body.status!==undefined&&!['open','done','canceled'].includes(body.status))
    throw new TypeError('INVALID_TASK_STATUS');
  const input=Object.fromEntries(['title','note','dueDate','dueTime','timezone','sourceDraftId'].map(k=>[k,
    Object.hasOwn(body,k)?body[k]:record[k]]));
  return {...normalizeActionTask(input),status:body.status||'open'};
}
export function publicActionTask(id,record){
  return {id,version:record.version||1,title:record.title||'',note:record.note||'',
    dueDate:record.dueDate||'',dueTime:record.dueTime||'',timezone:record.timezone||'',
    sourceDraftId:record.sourceDraftId||'',status:record.status||'open',
    createdAt:record.createdAt,updatedAt:record.updatedAt};
}
export function openTasksForDay(tasks,day){
  if(!calendarDate(day))return [];
  return (Array.isArray(tasks)?tasks:[]).filter(t=>t.status==='open')
    .sort((a,b)=>String(a.dueDate+' '+(a.dueTime||'99:99')).localeCompare(String(b.dueDate+' '+(b.dueTime||'99:99'))))
    .filter(t=>t.dueDate<=day);
}
