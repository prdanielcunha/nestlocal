import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public quote decisions require the tracking token and are idempotent', () => {
  const server = read('../server.mjs');
  for (const token of [
    "/api/public/requests/:requestId/decision",
    "trackingTokenHash!==hash(t)",
    "if(existing===decision)",
    "DECISION_LOCKED",
    "QUOTE_NOT_READY",
    "source:'public_tracking'",
    "by:'customer'",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('accepted and declined are first-class request statuses', () => {
  const server = read('../server.mjs');
  const client = read('../web/live.js');
  assert.ok(server.includes("'quoted','accepted','scheduled'"));
  assert.ok(server.includes("'completed','declined','cancelled'"));
  assert.ok(client.includes("'quoted','accepted','scheduled'"));
  assert.ok(client.includes("'completed','declined','cancelled'"));
});

test('tracking page exposes only safe decision state and display total', () => {
  const server = read('../server.mjs');
  for (const token of [
    'displayTotalCents',
    'canDecide',
    "decision:d.decision?{status:d.decision.status}:null",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('public UI lets a customer approve or decline an available quote', () => {
  const client = read('../web/live.js');
  for (const token of [
    'data-decision="accepted"',
    'data-decision="declined"',
    'approveQuote',
    'declineQuote',
    "/decision?token=",
    'quoteApproved',
    'quoteDeclined',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('decision styling exists', () => {
  const css = read('../web/operations.css');
  assert.ok(css.includes('.quote-decision'));
  assert.ok(css.includes('.decision-success'));
});
