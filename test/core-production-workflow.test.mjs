import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('bootstrap requires real business details and has no hard-coded launch cities',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/bootstrap'");
  const end=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/settings'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes('ONBOARDING_DETAILS_REQUIRED'));
  assert.ok(block.includes('coverageCodes'));
  assert.ok(block.includes('businessName'));
  assert.ok(block.includes('timezone'));
  assert.equal(block.includes("coverageCodes:['londrina','cambe']"),false);
  assert.equal(block.includes("'londrina','cambe'"),false);
});

test('publication is protected by server-side readiness and slug ownership',()=>{
  const server=read('../server.mjs');
  assert.ok(server.includes('function catalogReadiness('));
  for(const token of ['BUSINESS_NAME_REQUIRED','SLUG_REQUIRED','COVERAGE_REQUIRED','TIMEZONE_INVALID','SERVICE_REQUIRED','SERVICE_INVALID']) assert.ok(server.includes(token),'missing '+token);
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/publish'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/experiments'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes('PUBLISH_NOT_READY'));
  assert.ok(block.includes('readiness.issues'));
  assert.ok(block.includes('SLUG_TAKEN'));
});

test('authorized Home exposes readiness but never exposes tracking token hashes',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.get('/api/organizations/:orgId/nestlocal'");
  const end=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/team/:uid'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes('setupReadiness'));
  assert.ok(block.includes('trackingTokenHash:undefined'));
  assert.ok(block.includes('trackingTokenHashes:undefined'));
});

test('internal intake creates a real request and respects plan usage',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests',");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/quote'",start);
  const block=server.slice(start,end);
  for(const token of ['PLAN_REQUEST_LIMIT',"source:'internal'","status:'new'","quote:{","customerRef","usageRef","localIsoDate(timeZone)"]) assert.ok(block.includes(token),'missing '+token);
  assert.ok(block.includes("messagingConsent:{serviceUpdates:{accepted:false"));
});

test('manual quote is amount validated and moves review requests to quoted without fake causality',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/quote'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/tracking-link'",start);
  const block=server.slice(start,end);
  for(const token of ['INVALID_QUOTE','QUOTE_LOCKED',"outcome:'priced'","source:'manual'","status:'quoted'","quotedBy:req.identity.uid"]) assert.ok(block.includes(token),'missing '+token);
  assert.equal(block.includes('assistedConversion'),false);
});

test('tracking link is generated on demand and only hashed server-side',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/tracking-link'");
  const end=server.indexOf("app.patch('/api/organizations/:orgId/nestlocal/requests/:requestId'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes('QUOTE_NOT_READY'));
  assert.ok(block.includes('trackingTokenHash:digest'));
  assert.ok(block.includes('trackingTokenHashes:hashes'));
  assert.ok(block.includes('trackingPath:'));
  assert.equal(block.includes('trackingToken:publicToken'),false);
});

test('public tracking accepts current and small rolling hash set for link rotation compatibility',()=>{
  const server=read('../server.mjs');
  assert.ok(server.includes('const trackingTokenValid='));
  assert.ok(server.includes('record?.trackingTokenHash===digest'));
  assert.ok(server.includes('record?.trackingTokenHashes'));
  const publicGet=server.slice(server.indexOf("app.get('/api/public/requests/:requestId'"),server.indexOf("app.post('/api/public/requests/:requestId/decision"));
  assert.ok(publicGet.includes('trackingTokenValid(doc.data(),t)'));
});

test('lifecycle has explicit forward transitions and rejects arbitrary status jumps',()=>{
  const server=read('../server.mjs');
  for(const token of [
    "new:new Set(['reviewing','cancelled'])",
    "quoted:new Set(['accepted','declined','cancelled'])",
    "accepted:new Set(['scheduled','cancelled'])",
    "scheduled:new Set(['in_progress','cancelled','no_show'])",
    "in_progress:new Set(['completed'])",
    'INVALID_STATUS_TRANSITION',
  ]) assert.ok(server.includes(token),'missing '+token);
});

test('completion payment state cannot contradict total and paid amounts',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.patch('/api/organizations/:orgId/nestlocal/requests/:requestId'");
  const block=server.slice(start);
  for(const token of [
    'INVALID_PAYMENT_STATE',
    "nextPayment==='pending'&&nextPaid!==0",
    "nextPayment==='partial'&&!(nextPaid>0&&nextPaid<nextFinal)",
    "nextPayment==='paid'&&nextPaid!==nextFinal",
  ]) assert.ok(block.includes(token),'missing '+token);
});

test('internal preferred dates use organization timezone and public store exposes its timezone',()=>{
  const server=read('../server.mjs');
  assert.ok(server.includes("timeZone=validTimeZone(clean(settingsData.timezone))?clean(settingsData.timezone):'UTC'"));
  assert.ok(server.includes("timezone:settings.data().timezone||'America/Sao_Paulo'"));
  assert.ok(server.includes("if(preferredDate<localIsoDate(orgTimeZone))"));
});

test('core workflow UI has guided intake quote schedule execution customers and actionable empty states',()=>{
  const client=read('../web/live.js');
  for(const token of [
    'function newRequestForm()',
    'function quotePanel(r)',
    'function schedulePanel(r)',
    'function operationPanel(r)',
    'function customers()',
    'function customerCard(customer)',
    'data-request-quote',
    'data-tracking-link',
    'data-request-schedule',
    'data-request-operation',
    'actionable-empty',
    "customers:t('customers')",
  ]) assert.ok(client.includes(token),'missing '+token);
  assert.equal(client.includes('class="status-select"'),false);
});

test('onboarding and readiness are localized in PT EN ES',()=>{
  const client=read('../web/live.js');
  assert.ok(client.includes("setupBusiness:'Dados do negócio'"));
  assert.ok(client.includes("setupBusiness:'Business details'"));
  assert.ok(client.includes("setupBusiness:'Datos del negocio'"));
  assert.ok(client.includes("publishReadiness:'Pronto para publicar?'"));
  assert.ok(client.includes("publishReadiness:'Ready to publish?'"));
  assert.ok(client.includes("publishReadiness:'¿Listo para publicar?'"));
});

test('legal public copy is localized rather than hard-coded Portuguese',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('function legalView(){');
  const end=client.indexOf('function render(){',start);
  const block=client.slice(start,end);
  assert.ok(block.includes("t('privacyBody1')"));
  assert.ok(block.includes("t('termsBody1')"));
  assert.equal(block.includes('Os dados informados são enviados'),false);
});

test('mobile navigation no longer assumes exactly five tabs',()=>{
  const css=read('../web/styles.css');
  assert.ok(css.includes('.bottom-nav{position:fixed'));
  assert.ok(css.includes('overflow-x:auto'));
  assert.ok(css.includes('flex:1 0 72px'));
  assert.equal(css.includes('grid-template-columns:repeat(5,1fr);padding:8px;background:#0b1916eF'),false);
});

test('new workflow surfaces are responsive',()=>{
  const css=read('../web/operations.css');
  for(const token of ['.request-stage','.customer-card','.agenda-item','.readiness-card','.request-quote-form','.request-operation-form']) assert.ok(css.includes(token),'missing '+token);
  assert.ok(css.includes('@media(max-width:760px)'));
});
