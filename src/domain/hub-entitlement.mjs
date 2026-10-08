// Backend-only policy. Stripe billing remains authoritative for paid clients.
// No client-controlled flag, timestamp, subscription or trial may grant capabilities.
export const TRIAL_DURATION_MS = 168 * 60 * 60 * 1000;
function ms(value) {
  if(value && typeof value.toMillis==='function')return value.toMillis();
  if(value && typeof value.toDate==='function')return value.toDate().getTime();
  if(value instanceof Date)return value.getTime();
  if(typeof value==='string'){const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:null;}
  return null;
}
export function resolveHubNestLocalTrial(record, organizationApp, now=Date.now()) {
  if(!record||record.appId!=='nestlocal'||record.source!=='hub_internal_trial'||
     record.status!=='active'||record.revoked===true||record.consumed!==true||
     !Number.isSafeInteger(record.grantVersion)||record.grantVersion<2)return null;
  if(String(organizationApp?.status||'').toLowerCase()!=='trialing')return null;
  const start=ms(record.beginsAt),end=ms(record.expiresAt);
  if(start===null||end===null||end-start!==TRIAL_DURATION_MS||now<start)return null;
  const readOnly=now>=end;
  return Object.freeze({
    active:true,readOnly,canRead:true,canWrite:!readOnly,canUseAI:!readOnly,
    source:'hub_internal_trial',
    subscriptionStatus:readOnly?'internal_trial_expired':'internal_trial_active',
    endsAt:new Date(end).toISOString(),
  });
}
export function canNestLocalMutate(entitlement, method) {
  if(!entitlement?.active)return false;
  if(['GET','HEAD','OPTIONS'].includes(String(method||'').toUpperCase()))return true;
  return entitlement.readOnly!==true && entitlement.canWrite!==false;
}
export function isUnlimitedRequestsEnabled(env=process.env) {
  return env.NESTLOCAL_FAIR_USE_V2_ENABLED==='true';
}
