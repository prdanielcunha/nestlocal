// Pure guards shared by the NestLocal API and its regression tests.
// Missing historical expiry dates remain readable; malformed supplied dates fail closed.
export function quoteHasExpired(expiresAt, now=Date.now()){
  if(!expiresAt)return false;
  const timestamp=Date.parse(String(expiresAt));
  return !Number.isFinite(timestamp)||timestamp<=now;
}

export function currentScheduleRevision(schedule){
  const parsed=Number(schedule?.revision);
  return Number.isSafeInteger(parsed)&&parsed>0?parsed:(schedule?.date?1:0);
}

export function scheduleRevisionAfterPatch(schedule={},patch={}){
  const fields=[['scheduledDate','date'],['scheduledWindow','window'],['assignedTo','assignedTo']];
  const changed=fields.some(([input,existing])=>patch[input]!==undefined&&String(patch[input]??'').trim()!==String(schedule?.[existing]??'').trim());
  const before=currentScheduleRevision(schedule);
  return {changed,revision:changed?before+1:before};
}
