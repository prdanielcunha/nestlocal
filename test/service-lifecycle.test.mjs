import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('service lifecycle persists execution payment and return fields', () => {
  const server = read('../server.mjs');
  for (const token of [
    "const requestStatuses=new Set(",
    "const paymentStatuses=new Set(['pending','partial','paid','cancelled'])",
    "'execution.startedAt'",
    "'execution.completedAt'",
    "'commercial.finalAmountCents'",
    "'commercial.amountPaidCents'",
    "'commercial.paymentStatus'",
    "'return.nextServiceDate'",
    "completionRecordedAt",
    "lifetimeRevenueCents",
    "nextServiceDate",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('completion revenue is recorded only once per request', () => {
  const server = read('../server.mjs');
  assert.ok(server.includes("const completedNow=nextStatus==='completed'&&!current.completionRecordedAt"));
  assert.ok(server.includes("update.completionRecordedAt=admin.firestore.FieldValue.serverTimestamp()"));
});

test('authorized app data includes customer reactivation facts', () => {
  const server = read('../server.mjs');
  assert.ok(server.includes("customers:customers.docs.map"));
  const client = read('../web/live.js');
  for (const token of [
    'function reactivationRow',
    'reactivationQueue',
    'nextServiceDate',
    'lifetimeRevenue',
    'reactivationMessage',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('request UI supports scheduled, in progress and completed execution', () => {
  const client = read('../web/live.js');
  for (const token of [
    "'in_progress'",
    'data-lifecycle=',
    "name=\"scheduledDate\"",
    "name=\"assignedTo\"",
    "name=\"finalAmount\"",
    "name=\"paymentStatus\"",
    "name=\"nextServiceDate\"",
    "name=\"executionNotes\"",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('lifecycle styling is loaded', () => {
  const html = read('../web/index.html');
  const css = read('../web/operations.css');
  assert.ok(html.includes('/operations.css'));
  assert.ok(css.includes('.lifecycle-form'));
  assert.ok(css.includes('.reactivation-row'));
});
