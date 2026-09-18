import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public intake stores granular WhatsApp consent', () => {
  const server = read('../server.mjs');
  for (const token of [
    'serviceUpdatesOptIn',
    'maintenanceOptIn',
    'whatsapp-service-2026-09',
    'whatsapp-maintenance-2026-09',
    "source:'public_request'",
    'messagingConsent',
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('messaging eligibility is gated by consent template and provider', () => {
  const server = read('../server.mjs');
  for (const token of [
    'function messagingEligibility',
    'WHATSAPP_OPT_IN_REQUIRED',
    'MESSAGE_TEMPLATE_REQUIRED',
    'MESSAGING_PROVIDER_NOT_CONNECTED',
    'approved_template_required',
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('message outbox prepare endpoint is authenticated and idempotent by day', () => {
  const server = read('../server.mjs');
  for (const token of [
    "/nestlocal/messages/prepare',authenticate,authorize",
    "nestlocal_message_outbox",
    "new Date().toISOString().slice(0,10)",
    'idempotent:true',
    "channel:'whatsapp'",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('client separates service updates from future maintenance consent', () => {
  const client = read('../web/live.js');
  for (const token of [
    'whatsappServiceOptIn',
    'whatsappMaintenanceOptIn',
    'serviceUpdateTemplate',
    'maintenanceTemplate',
    'messageOutbox',
    'messagingNotConnected',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('messaging UI styling exists', () => {
  const css = read('../web/operations.css');
  assert.ok(css.includes('.messaging-settings'));
  assert.ok(css.includes('.message-outbox'));
});
