import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const client=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');

test('anonymous diagnostic preview is separate from all lead writes',()=>{
  const start=server.indexOf("app.post('/api/public/growth/diagnostic/preview'");
  const end=server.indexOf("app.post('/api/public/growth/diagnostic/lead'",start);
  assert.ok(start>=0&&end>start);
  const preview=server.slice(start,end);
  assert.match(preview,/diagnosticProjection\(b\)/);
  assert.match(preview,/PREVIEW_MUST_BE_ANONYMOUS/);
  assert.match(preview,/leadCreated:false/);
  assert.doesNotMatch(preview,/nestlocal_growth_leads|db\.collection|ref\.create|tx\.set/);
});

test('follow-up lead is purpose-limited and idempotent',()=>{
  const start=server.indexOf("app.post('/api/public/growth/diagnostic/lead'");
  const end=server.indexOf("app.post('/api/public/growth/diagnostic',",start);
  assert.ok(start>=0&&end>start);
  const lead=server.slice(start,end);
  for(const token of [
    'acceptedTerms!==true','acceptedContact!==true',
    "contactChannel==='email'","contactChannel==='phone'",
    "purpose:'diagnostic_follow_up'","hash('xray-consent-v2:'",
    'await ref.create(record)','created:false'
  ])assert.ok(lead.includes(token),'missing '+token);
  assert.ok(lead.includes("contactChannel==='email'?contactEmail:contactPhone"));
});

test('existing diagnostic contract and formulas remain intact',()=>{
  assert.ok(server.includes("app.post('/api/public/growth/diagnostic',"));
  assert.ok(server.includes('const recoveryAssumption=0.15'));
  assert.ok(server.includes('fitScore:growthFitScore'));
});

test('public UX calculates before requesting personal data, in three languages',()=>{
  const start=client.indexOf('function revenueXrayView()');
  const end=client.indexOf('function growthOutreachScript',start);
  const view=client.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.doesNotMatch(view,/name="businessName"|name="contactName"|name="phone"|name="acceptedTerms"/);
  assert.ok(view.includes('xrayLeadSignupView()'));
  for(const t of ['pt:{heading:', 'en:{heading:', 'es:{heading:', 'acceptedContact'])assert.ok(client.includes(t));
  assert.ok(client.includes('/api/public/growth/diagnostic/preview'));
  assert.ok(client.includes('/api/public/growth/diagnostic/lead'));
});
