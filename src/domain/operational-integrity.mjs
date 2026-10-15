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
  if(record?.status==='completed'&&!record?.completionRecordedAt&&patch.finalAmountCents!==undefined){
    const original=record.commercial?.finalAmountCents??record.quote?.totalCents;
    // No completion marker means legacy revenue recognition is unverified.
    // Equal-value edits remain compatible; actual corrections require review.
    if(original==null||!Number.isSafeInteger(Number(original))||
       Number(patch.finalAmountCents)!==Number(original))
      throw new TypeError('FINANCIAL_RECONCILIATION_REQUIRED');
  }
  if(record?.status!=='completed'||!record?.completionRecordedAt||patch.finalAmountCents===undefined)
    return {changed:false,deltaCents:0,oldAmountCents:null,newAmountCents:null};
  const oldValue=record.commercial?.finalAmountCents??record.quote?.totalCents;
  const oldAmountCents=Number(oldValue),newAmountCents=Number(patch.finalAmountCents);
  if(oldValue==null||!Number.isSafeInteger(oldAmountCents)||oldAmountCents<0||
     !Number.isSafeInteger(newAmountCents)||newAmountCents<0||newAmountCents>100000000)
    throw new TypeError('FINANCIAL_RECONCILIATION_REQUIRED');
  return {changed:oldAmountCents!==newAmountCents,deltaCents:newAmountCents-oldAmountCents,oldAmountCents,newAmountCents};
}

/**
 * Returns manual cash-record corrections; not a payment processor confirmation.
 * Recording signed deltas (including reversals) is idempotent under Firestore
 * transactions because the request revision is advanced with the event.
 */
export function manualPaymentAdjustment(record={},patch={}){
  const hasChange=patch.amountPaidCents!==undefined||patch.paymentStatus!==undefined;
  const oldStatus=String(record.commercial?.paymentStatus||'pending');
  const rawOld=record.commercial?.amountPaidCents;
  if(hasChange&&rawOld==null&&['partial','paid'].includes(oldStatus))
    throw new TypeError('PAYMENT_RECONCILIATION_REQUIRED');
  const oldAmountCents=rawOld==null?0:Number(rawOld);
  const nextAmountCents=patch.amountPaidCents===undefined?oldAmountCents:Number(patch.amountPaidCents);
  const nextStatus=patch.paymentStatus===undefined?oldStatus:String(patch.paymentStatus);
  if(!Number.isSafeInteger(oldAmountCents)||oldAmountCents<0||
     !Number.isSafeInteger(nextAmountCents)||nextAmountCents<0||nextAmountCents>100000000)
    throw new TypeError('PAYMENT_RECONCILIATION_REQUIRED');
  const changed=hasChange&&(oldAmountCents!==nextAmountCents||oldStatus!==nextStatus);
  const version=Number(record.commercial?.paymentRevision||0);
  if(changed&&(!Number.isSafeInteger(version)||version<0))
    throw new TypeError('PAYMENT_RECONCILIATION_REQUIRED');
  return {changed,oldAmountCents,newAmountCents:nextAmountCents,
    deltaCents:nextAmountCents-oldAmountCents,oldStatus,newStatus:nextStatus,
    revision:changed?version+1:version};
}
