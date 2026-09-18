import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('reminder readiness is computed from due customers and messaging eligibility', () => {
  const server = read('../server.mjs');
  for (const token of [
    'function reminderReadiness',
    "nextServiceDate)&&clean(c.nextServiceDate)<=today",
    "messagingEligibility({category:'maintenance_reminder'",
    'consentedCount',
    'readyCount',
    'reasonCounts',
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('organization load queries due customers directly in the organization timezone', () => {
  const server = read('../server.mjs');
  for (const token of [
    "timeZone=validTimeZone(clean(settingsData?.timezone))",
    ".where('nextServiceDate','<=',today).orderBy('nextServiceDate').limit(dueLimit)",
    'dueCountTruncated',
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('batch preparation persists only eligible ready reminders', () => {
  const server = read('../server.mjs');
  const start = server.indexOf("/nestlocal/messages/prepare-due-reminders'");
  const end = server.indexOf("app.get('/api/organizations/:orgId/nestlocal/requests/:requestId/photos", start);
  assert.ok(start >= 0 && end > start);
  const block = server.slice(start, end);
  assert.ok(block.includes("eligible=readiness.items.filter(x=>x.eligible)"));
  assert.ok(block.includes("status:'ready'"));
  assert.equal(block.includes("status:'blocked'"), false);
  assert.ok(block.includes('if(preparedCount)await batch.commit()'));
});

test('prepared reminders carry delivery contract evidence without phone duplication', () => {
  const server = read('../server.mjs');
  const start = server.indexOf("/nestlocal/messages/prepare-due-reminders'");
  const end = server.indexOf("app.get('/api/organizations/:orgId/nestlocal/requests/:requestId/photos", start);
  const block = server.slice(start, end);
  for (const token of [
    "sourceApp:'nestlocal'",
    'deliveryContractVersion:1',
    'consentEvidenceRef:',
    "sendMode:'approved_template_required'",
  ]) assert.ok(block.includes(token), `missing ${token}`);
  assert.equal(block.includes('recipientPhone'), false);
});

test('single message preparation uses organization-local idempotency day', () => {
  const server = read('../server.mjs');
  assert.ok(server.includes("day=localIsoDate(timeZone),templateName=clean(eligibility.templateName)"));
  assert.ok(server.includes("eligibility.reason==='WHATSAPP_OPT_IN_REQUIRED'?'':"));
});

test('automation UI displays readiness and only enables batch preparation when ready', () => {
  const client = read('../web/live.js');
  for (const token of [
    "reminderReadiness:'Prontidão dos lembretes'",
    'S.data.reminderReadiness',
    'id="prepare-reminders"',
    "readiness.readyCount?'':'disabled'",
    "/nestlocal/messages/prepare-due-reminders",
    'dueCountTruncated',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('reminder readiness dashboard styling exists', () => {
  const css = read('../web/operations.css');
  assert.ok(css.includes('.reminder-readiness-card'));
  assert.ok(css.includes('.readiness-metrics'));
  assert.ok(css.includes('.readiness-reasons'));
});
