import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('SaaS access is server-authored and plan scoped', () => {
  const server = read('../server.mjs');
  for (const token of [
    "function nestLocalEntitlement",
    "subscriptionData?.apps?.nestlocal",
    "activeSubscriptionStatuses",
    "orgData?.apps?.nestlocal",
    "SUBSCRIPTION_PAYMENT_REQUIRED",
    "SUBSCRIPTION_REQUIRED",
    "PLAN_REQUEST_LIMIT",
    "nestlocal_usage",
    "requestsPerMonth",
    "PLAN_USER_LIMIT",
    "/nestlocal/team/:uid",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('the client supports central checkout and short-lived Hub handoff', () => {
  const client = read('../web/live.js');
  for (const token of [
    'signInWithCustomToken',
    "context?.appId!=='nestlocal'",
    'nestlocal_${id}_monthly',
    'app=nestlocal',
    'data-team',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('all SaaS copy is available in Portuguese, English, and Spanish', () => {
  const client = read('../web/live.js');
  assert.ok(client.includes("Object.assign(D.pt,{choosePlan:"));
  assert.ok(client.includes("Object.assign(D.en,{choosePlan:"));
  assert.ok(client.includes("Object.assign(D.es,{choosePlan:"));
});
