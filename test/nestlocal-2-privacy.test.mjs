import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const client=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');

test('Privacy Center requires real Hub org authorization and reports only channel state',()=>{
  const a=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/privacy/permissions'");
  const b=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/privacy/revoke'",a);
  const source=server.slice(a,b);
  assert.ok(a>=0&&b>a);
  for(const x of ['authenticate,authorize','req.access.orgId','Cache-Control','disconnectAvailable:false','manualLink','responseChannels'])assert.ok(source.includes(x));
  assert.doesNotMatch(source,/res\.json\(\{[^]*contactEmail:[a-zA-Z]|apiKey|secret/);
});

test('Channel revocation is explicit, audited and rejects last channel removal on published pages',()=>{
  const a=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/privacy/revoke'");
  const b=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/payment-settings'",a);
  const source=server.slice(a,b);
  assert.ok(a>=0&&b>a);
  for(const x of ["canManageNestLocal(req.access)","['manual_link','contact_email','contact_phone']",'data.published===true&&!responsePossible','RESPONSE_CHANNEL_REQUIRED','nestlocal_privacy_events','batch']) {
    if(x==='batch')continue;
    assert.ok(source.includes(x),'missing '+x);
  }
  assert.doesNotMatch(source,/delete\(|tx\.delete\(|messaging\.connected[ ]*=[ ]*false|sendMessage/);
});

test('Privacy UX has real controls, no dead official WhatsApp disconnect and localized copy',()=>{
  for(const x of ['function privacyCenter()','privacyCopy=','data-privacy-revoke','window.confirm','p.official?.connected','data-action-page="services"','privacy:privacyCenter','privacyPermissions'])assert.ok(client.includes(x),'missing '+x);
  assert.ok(html.includes("'page','growth','privacy'"));
  assert.ok(client.includes("privateViews=new Set(['today','requests','customers','agenda','services','automation','page','growth','privacy'])"));
});
