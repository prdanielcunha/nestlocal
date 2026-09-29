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
    "SUBSCRIPTION_NOT_FOUND",
    "SUBSCRIPTION_INACTIVE",
    "ENTITLEMENT_INACTIVE",
    "PLAN_REQUEST_LIMIT",
    "nestlocal_usage",
    "requestsPerMonth",
    "PLAN_USER_LIMIT",
    "/nestlocal/team/:uid",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('the client supports central checkout and short-lived backend Hub handoff', () => {
  const client = read('../web/live.js');
  const server = read('../server.mjs');
  for (const token of [
    "/api/auth/handoff/redeem",
    "params.get('code')",
    'nestlocal_${id}_monthly',
    'app=nestlocal',
    'data-team',
  ]) assert.ok(client.includes(token), `missing ${token}`);
  for (const token of [
    "__session",
    "handoff.appId!=='nestlocal'",
    "consumedBy:'nestlocal-backend-session-v1'",
  ]) assert.ok(server.includes(token), `missing ${token}`);
  assert.equal(client.includes('signInWithCustomToken'), false);
});

test('all SaaS copy is available in Portuguese, English, and Spanish', () => {
  const client = read('../web/live.js');
  assert.ok(client.includes("Object.assign(D.pt,{choosePlan:"));
  assert.ok(client.includes("Object.assign(D.en,{choosePlan:"));
  assert.ok(client.includes("Object.assign(D.es,{choosePlan:"));
});
