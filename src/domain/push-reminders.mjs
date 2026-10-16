// No external effects, identifiers, customer names, phone numbers or message text.
function localParts(at,zone){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone||'UTC',year:'numeric',
    month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
    .formatToParts(at);
  const out=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return {date:`${out.year}-${out.month}-${out.day}`,time:`${out.hour}:${out.minute}`};
}
export function taskDueAt(task,now=new Date()){
  if(task?.status!=='open'||!/^\d{4}-\d{2}-\d{2}$/.test(String(task?.dueDate||'')))return false;
  try{
    const local=localParts(now,task.timezone);
    if(task.dueDate<local.date)return true;
    if(task.dueDate>local.date)return false;
    return !task.dueTime||task.dueTime<=local.time;
  }catch{return false}
}
export function dueActorsForPush(tasks,now=new Date()){
  const result=new Map();
  for(const task of tasks){
    const uid=String(task?.actorUid||'');
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid)||!taskDueAt(task,now))continue;
    try{
      const date=localParts(now,task.timezone).date;
      if(!result.has(uid))result.set(uid,date);
    }catch{/* invalid timezone never dispatches */}
  }
  return [...result.entries()].map(([uid,date])=>({uid,date}));
}
