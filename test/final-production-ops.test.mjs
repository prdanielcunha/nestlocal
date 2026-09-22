import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('sensitive configuration routes require NestLocal owner/admin capability',()=>{
  const server=read('../server.mjs');
  for(const route of [
    "nestlocal/bootstrap',authenticate,authorize,requireNestLocalAdmin",
    "nestlocal/settings',authenticate,authorize,requireNestLocalAdmin",
    "nestlocal/capacity',authenticate,authorize,requireNestLocalAdmin",
    "nestlocal/services/:serviceId',authenticate,authorize,requireNestLocalAdmin",
    "nestlocal/publish',authenticate,authorize,requireNestLocalAdmin",
    "nestlocal/team/:uid',authenticate,authorize,requireNestLocalAdmin",
  ]) assert.ok(server.includes(route),'missing '+route);
  assert.ok(server.includes("const requireNestLocalAdmin=(req,res,next)=>canManageNestLocal(req.access)?next():sendError(res,403,'ACCESS_DENIED')"));
});

test('operational request handling remains available through normal authorized app access',()=>{
  const server=read('../server.mjs');
  for(const route of [
    "nestlocal/requests',authenticate,authorize,async",
    "nestlocal/requests/:requestId/quote',authenticate,authorize,async",
    "nestlocal/requests/:requestId/tracking-link',authenticate,authorize,async",
    "nestlocal/requests/:requestId',authenticate,authorize,async",
  ]) assert.ok(server.includes(route),'missing operational route '+route);
});

test('Home publishes explicit management capabilities instead of making the client infer roles',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.get('/api/organizations/:orgId/nestlocal'");
  const end=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/requests-page'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes('accessCapabilities:{canManageSettings:canManage,canManageTeam:canManage,canManageExperiments:canManage}'));
  const client=read('../web/live.js');
  assert.ok(client.includes("const canManageSettings=()=>S.data?.accessCapabilities?.canManageSettings===true"));
  assert.ok(client.includes("const canManageTeam=()=>S.data?.accessCapabilities?.canManageTeam===true"));
});

test('non-manager UI is read-only for setup catalog capacity and team access',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "if(!canManageSettings())return",
    "configurationReadOnly",
    "if(!manage)return",
    "canManageTeam()",
    "data-team=",
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('operator-recorded WhatsApp consent is explicit auditable and never implicit',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/consent'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/quote'",start);
  const block=server.slice(start,end);
  for(const token of [
    "confirmedByCustomer=b.confirmedByCustomer===true",
    "typeof accepted!=='boolean'",
    "consentEvidenceSources.has(evidenceSource)",
    "nestlocal_consent_events",
    "source:'operator_recorded'",
    "recordedBy:req.identity.uid",
    "messagingConsent.",
    "messaging.consents.",
  ]) assert.ok(block.includes(token),'missing '+token);
  assert.ok(block.includes("if(!requestId||!consentPurposes.has(purpose)"));
});

test('consent UI requires a customer-choice confirmation and supports revoke by explicit unchecked state',()=>{
  const client=read('../web/live.js');
  for(const token of [
    'function consentPanel(r)',
    'data-request-consent=',
    'data-consent-purpose=',
    'name="confirmedByCustomer" type="checkbox" required',
    "accepted:f.get('accepted')==='on'",
    "confirmedByCustomer:f.get('confirmedByCustomer')==='on'",
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('rotated tracking tokens remain valid for public photo upload',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/public/requests/:requestId/photos'");
  const end=server.indexOf("app.get('/api/session'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes('trackingTokenValid(doc.data(),t)'));
  assert.equal(block.includes('trackingTokenHash!==hash(t)'),false);
});

test('Home merges active work with recent history so older active requests are not hidden by completed volume',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.get('/api/organizations/:orgId/nestlocal'");
  const end=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/requests-page'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes("where('status','in',['new','reviewing','quoted','accepted','scheduled','in_progress'])"));
  assert.ok(block.includes('requestMap=new Map()'));
  assert.ok(block.includes('[...activeRequests.docs,...recentRequests.docs]'));
  assert.ok(block.includes('activeRequestsTruncated'));
});

test('request and customer history have bounded cursor pagination',()=>{
  const server=read('../server.mjs');
  for(const route of ['nestlocal/requests-page','nestlocal/customers-page']) assert.ok(server.includes(route),'missing '+route);
  assert.ok(server.includes('Math.min(100,Math.max(20,Number(req.query.limit)||100))'));
  assert.ok(server.includes('query.startAfter(cursorDoc)'));
  assert.ok(server.includes('query.limit(pageSize+1)'));
  const client=read('../web/live.js');
  assert.ok(client.includes('id="load-more-requests"'));
  assert.ok(client.includes('id="load-more-customers"'));
  assert.ok(client.includes('/nestlocal/requests-page?cursor='));
  assert.ok(client.includes('/nestlocal/customers-page?cursor='));
});

test('authorized request pagination never returns tracking hashes',()=>{
  const server=read('../server.mjs');
  assert.ok(server.includes('const sanitizeRequestDoc='));
  assert.ok(server.includes('trackingTokenHash:undefined'));
  assert.ok(server.includes('trackingTokenHashes:undefined'));
  const start=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/requests-page'");
  const end=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/customers-page'",start);
  assert.ok(server.slice(start,end).includes('docs.map(sanitizeRequestDoc)'));
});

test('organization usage month follows organization timezone instead of UTC month boundary',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.get('/api/organizations/:orgId/nestlocal'");
  const end=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/requests-page'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes("today=localIsoDate(timeZone),monthId=today.slice(0,7)"));
});

test('client API has bounded timeout and retries only idempotent GET requests',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "maxAttempts=(requestOpt.method||'GET').toUpperCase()==='GET'?2:1",
    "form?60000:20000",
    "err?.name==='AbortError'?'REQUEST_TIMEOUT':'NETWORK_ERROR'",
    "throw apiException('NETWORK_ERROR')",
    'const toastError=',
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('automation page is actionable without pretending prepared messages were sent',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('function automations(){');
  const end=client.indexOf('function page(){',start);
  const block=client.slice(start,end);
  assert.ok(block.includes('data-open-request='));
  assert.ok(block.includes("t('outboxPreparedOnly')"));
  assert.ok(block.includes("t('manualWhatsappAvailable')"));
});

test('final operations copy remains localized in PT EN ES',()=>{
  const client=read('../web/live.js');
  assert.ok(client.includes("whatsappPermissions:'Permissões de WhatsApp'"));
  assert.ok(client.includes("whatsappPermissions:'WhatsApp permissions'"));
  assert.ok(client.includes("whatsappPermissions:'Permisos de WhatsApp'"));
  assert.ok(client.includes("error_NETWORK_ERROR:'Sem conexão com o servidor."));
  assert.ok(client.includes("error_NETWORK_ERROR:'The server could not be reached."));
  assert.ok(client.includes("error_NETWORK_ERROR:'No se pudo conectar con el servidor."));
});

test('final operational states have responsive styling',()=>{
  const css=read('../web/operations.css');
  for(const token of ['.request-consent-panel','.consent-choice-grid','.pagination-footer','.read-only-config','.config-summary','.messaging-manual-notice']) assert.ok(css.includes(token),'missing '+token);
});
