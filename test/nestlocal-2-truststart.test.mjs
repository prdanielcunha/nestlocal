import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const client=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');

test('TrustStart permits non-WhatsApp response channels but does not publish a new store without one',()=>{
  const start=server.indexOf('function catalogReadiness('),end=server.indexOf('function nestLocalEntitlement(',start);
  const source=server.slice(start,end);
  assert.ok(start>=0&&end>start);
  for(const token of ['trustSetupVersion','RESPONSE_CHANNEL_REQUIRED','validContactEmail(settings.contactEmail)','phone(settings.contactPhone)','MANUAL_WHATSAPP_NUMBER_REQUIRED'])assert.ok(source.includes(token));
});

test('TrustStart backend preserves legacy customer IDs and supports email-only customers',()=>{
  assert.ok(server.includes("hash(customerPhone||'email:'+customerEmail)"));
  assert.ok(server.includes('customer:{name,phone:customerPhone,email:customerEmail}'));
  assert.ok(server.includes('customerEmail&&!validContactEmail(customerEmail)'));
  assert.ok(server.includes('customerPhone.length<10&&(serviceUpdatesOptIn||maintenanceOptIn)'));
  assert.ok(server.includes('contactEmail,contactPhone,trustSetupVersion:2'));
});

test('official WhatsApp cannot be enabled merely by selecting a frontend control',()=>{
  const start=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/settings'");
  const end=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/payment-settings'",start);
  const src=server.slice(start,end);
  assert.ok(src.includes('OFFICIAL_CHANNEL_NOT_CONNECTED'));
  assert.ok(src.includes('previous.data()?.messaging?.connected!==true'));
  assert.ok(src.includes('updatingChannels'));
});

test('mobile onboarding and public requests explain alternatives in PT EN ES',()=>{
  for(const token of ['trustStartCopy','trustStartFields()','trustStartFields(s)','none:', 'manual:', 'official:', 'name="contactEmail"','name="contactPhone"','name="communicationMode"', 'name="email"', 'emailOrPhone'])assert.ok(client.includes(token),'missing '+token);
  assert.ok(client.includes("f.get('contactEmail')"));
  assert.ok(client.includes("f.get('contactPhone')"));
  assert.ok(client.includes("String(b.phone||'').trim()"));
});
