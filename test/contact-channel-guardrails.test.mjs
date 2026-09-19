import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('WhatsApp action events require purpose-specific consent', () => {
  const server = read('../server.mjs');
  for (const token of [
    "channel==='whatsapp'&&data.messagingConsent?.serviceUpdates?.accepted!==true",
    "channel==='whatsapp'&&data.messaging?.consents?.maintenanceReminders?.accepted!==true",
    "WHATSAPP_OPT_IN_REQUIRED",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('action idempotency is separated by channel and organization local day', () => {
  const server = read('../server.mjs');
  assert.ok(server.includes("today=localIsoDate(timeZone)"));
  assert.ok(server.includes("${actionType}|${requestId||customerId}|${channel}|${day}"));
});

test('client only exposes WhatsApp action when compatible consent exists', () => {
  const client = read('../web/live.js');
  const playbooks = read('../web/action-playbooks.js');
  for (const token of [
    "whatsappAllowed:r.messagingConsent?.serviceUpdates?.accepted===true",
    "whatsappAllowed:c.messaging?.consents?.maintenanceReminders?.accepted===true",
    "playbook.whatsappAllowed&&phone",
    "whatsappNoOptIn",
  ]) assert.ok(client.includes(token), `missing ${token}`);
  assert.ok(playbooks.includes("if(action.whatsappAllowed!==true)"), 'playbook readiness must fail closed without purpose consent');
});

test('phone stays available as an explicit non-WhatsApp channel', () => {
  const client = read('../web/live.js');
  for (const token of [
    'data-assistance-channel="phone"',
    "t('recordCall')",
    'href="tel:+',
    "button.dataset.assistanceChannel",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('Today and next-best actions use organization date', () => {
  const client = read('../web/live.js');
  assert.ok(client.includes('function organizationDateIso()'));
  assert.ok(client.includes('today=organizationDateIso()'));
  assert.ok(client.includes('todayIso=organizationDateIso()'));
});

test('channel guardrail state is visible and responsive', () => {
  const css = read('../web/operations.css');
  assert.ok(css.includes('.consent-status.blocked'));
  assert.ok(css.includes('.assistance-actions .consent-status'));
});
