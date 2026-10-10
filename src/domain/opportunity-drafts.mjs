// NestLocal 2.0: manual intake is not a quote, order, payment or sent message.
// Keep partial facts private to a tenant; never infer identity or commercial authority.
export const DRAFT_SCHEMA_VERSION = 2;
const origins = new Set(['whatsapp_manual','instagram','website','telephone','referral','other']);
const text = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const has = (body,key) => Object.prototype.hasOwnProperty.call(body,key);
export function normalizeOpportunityDraft(body) {
  if(!body||typeof body!=='object'||Array.isArray(body))throw new TypeError('INVALID_DRAFT');
  const allowed = new Set(['origin','message','serviceSummary','customerName','phone','email']);
  if(Object.keys(body).some(key=>!allowed.has(key)))throw new TypeError('INVALID_DRAFT_FIELDS');
  const origin = text(body.origin,30) || 'other';
  if(!origins.has(origin))throw new TypeError('INVALID_DRAFT_ORIGIN');
  const email = text(body.email,254).toLowerCase();
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new TypeError('INVALID_DRAFT_EMAIL');
  const phone = text(body.phone,40).replace(/\D/g,'').slice(0,15);
  if(phone && phone.length<10)throw new TypeError('INVALID_DRAFT_PHONE');
  const result = {
    schemaVersion:DRAFT_SCHEMA_VERSION,
    origin,
    message:text(body.message,6000),
    serviceSummary:text(body.serviceSummary,240),
    customerName:text(body.customerName,100),
    phone,
    email
  };
  if(!result.message && !result.serviceSummary && !result.customerName)
    throw new TypeError('DRAFT_CONTENT_REQUIRED');
  return result;
}
export function normalizeOpportunityDraftPatch(body,previous) {
  if(!body||typeof body!=='object'||Array.isArray(body)||!previous||previous.state!=='open')
    throw new TypeError('DRAFT_NOT_EDITABLE');
  const allowed = new Set(['origin','message','serviceSummary','customerName','phone','email','state','expectedVersion']);
  if(Object.keys(body).some(key=>!allowed.has(key)))throw new TypeError('INVALID_DRAFT_FIELDS');
  if(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion!==previous.version)
    throw new TypeError('DRAFT_VERSION_CONFLICT');
  if(has(body,'state')&&!['open','archived'].includes(body.state))
    throw new TypeError('INVALID_DRAFT_STATE');
  const fields = ['origin','message','serviceSummary','customerName','phone','email'];
  const merged = Object.fromEntries(fields.map(field=>[field,has(body,field)?body[field]:previous[field]]));
  return {...normalizeOpportunityDraft(merged),state:body.state||'open'};
}
export function parseOpportunityIdempotencyKey(value) {
  if(typeof value!=='string'||!/^[A-Za-z0-9_.:-]{8,128}$/.test(value))
    throw new TypeError('IDEMPOTENCY_KEY_REQUIRED');
  return value;
}
export function draftPublicView(id,record) {
  return {
    id,version:record.version||1,schemaVersion:record.schemaVersion||DRAFT_SCHEMA_VERSION,
    state:record.state||'open',origin:record.origin||'other',
    message:record.message||'',serviceSummary:record.serviceSummary||'',
    customerName:record.customerName||'',phone:record.phone||'',email:record.email||'',
    createdAt:record.createdAt,updatedAt:record.updatedAt,
    // No contact provenance means no marketing consent and no automatic send.
    linkedRequestId:record.linkedRequestId||null
  };
}
