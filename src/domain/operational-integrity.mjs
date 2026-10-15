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

/** A completed service is recognized once. Later edits reconcile only the difference.
 * Paid amount is independent of revenue recognized for completed work.
 * This helper never creates an adjustment event for repeated identical writes.
 */
export function completedAmountAdjustment(record,patch={}){
  if(record?.status!=='completed'||!record?.completionRecordedAt||patch.finalAmountCents===undefined)
    return {changed:false,deltaCents:0,oldAmountCents:null,newAmountCents:null};
  const oldValue=record.commercial?.finalAmountCents??record.quote?.totalCents;
  const oldAmountCents=Number(oldValue),newAmountCents=Number(patch.finalAmountCents);
  if(oldValue==null||!Number.isSafeInteger(oldAmountCents)||oldAmountCents<0||
     !Number.isSafeInteger(newAmountCents)||newAmountCents<0||newAmountCents>100000000)
    throw new TypeError('FINANCIAL_RECONCILIATION_REQUIRED');
  return {changed:oldAmountCents!==newAmountCents,deltaCents:newAmountCents-oldAmountCents,oldAmountCents,newAmountCents};
}
