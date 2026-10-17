// Read-only validation of a request's financial representation.
// Warnings require manual reconciliation; this module NEVER changes the ledger.
const safeCents=value=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=100000000;
export function inspectRequestFinance(record={},assistedEvent=null){
 const issues=[],c=record.commercial||{},status=String(record.status||''),
  amountRaw=c.finalAmountCents??record.quote?.totalCents,
  finalAmount=safeCents(amountRaw)?amountRaw:null,
  paymentRaw=c.amountPaidCents,paid=paymentRaw===undefined||paymentRaw===null?null:paymentRaw,
  paymentStatus=String(c.paymentStatus||'pending');
 if(status==='completed'){
  if(!record.completionRecordedAt)issues.push('LEGACY_COMPLETION_UNVERIFIED');
  if(finalAmount===null)issues.push('COMPLETED_AMOUNT_UNKNOWN');
 }
 if(paymentRaw==null&&['paid','partial'].includes(paymentStatus))
  issues.push('HISTORICAL_PAYMENT_AMOUNT_UNKNOWN');
 if(paymentRaw!=null&&!safeCents(paymentRaw))issues.push('INVALID_PAYMENT_AMOUNT');
 if(!['pending','partial','paid','cancelled'].includes(paymentStatus))
  issues.push('INVALID_PAYMENT_STATUS');
 if(paid!==null&&safeCents(paid)){
  if(finalAmount!==null&&paid>finalAmount)issues.push('PAID_EXCEEDS_AMOUNT');
  if(paymentStatus==='pending'&&paid!==0)issues.push('PENDING_WITH_RECEIPTS');
  if(paymentStatus==='cancelled'&&paid!==0)issues.push('CANCELLED_WITH_RECEIPTS');
  if(paymentStatus==='partial'&&(paid<=0||(finalAmount!==null&&paid>=finalAmount)))
   issues.push('PARTIAL_AMOUNT_INCONSISTENT');
  if(paymentStatus==='paid'&&(finalAmount===null||finalAmount<=0||paid!==finalAmount))
   issues.push('PAID_AMOUNT_INCONSISTENT');
 }
 if(record.attribution?.assisted===true&&status==='completed'){
  if(assistedEvent===null)issues.push('ASSISTED_EVENT_MISSING');
  else if(finalAmount!==null&&assistedEvent.amountCents!==finalAmount)
   issues.push('ASSISTED_EVENT_AMOUNT_MISMATCH');
 }
 return {issues,completed:status==='completed',
  executedCents:status==='completed'?finalAmount:null,
  manuallyRecordedPaidCents:safeCents(paid)?paid:null};
}
export function summarizeRequestFinance(records=[],totalCount=records.length){
 const result={scanned:records.length,totalCount,
  complete:records.length===totalCount,completed:0,recordedExecutedCents:0,
  recordedManualPaidCents:0,issues:{}};
 for(const entry of records){
  const detail=entry?.assessment||inspectRequestFinance(entry?.record||entry||{},entry?.assistedEvent||null);
  if(detail.completed)result.completed++;
  if(detail.executedCents!==null)result.recordedExecutedCents+=detail.executedCents;
  if(detail.manuallyRecordedPaidCents!==null)result.recordedManualPaidCents+=detail.manuallyRecordedPaidCents;
  for(const issue of detail.issues)result.issues[issue]=(result.issues[issue]||0)+1;
 }
 return result;
}
