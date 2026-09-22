import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('NestLocal server mirrors Hub app-scoped entitlement gates',()=>{
  const server=read('../server.mjs');
  for(const token of [
    'function nestLocalEntitlement',
    "subscriptionData?.apps?.nestlocal",
    "orgData?.apps?.nestlocal",
    "SUBSCRIPTION_NOT_FOUND",
    "SUBSCRIPTION_PAYMENT_REQUIRED",
    "SUBSCRIPTION_INACTIVE",
    "ENTITLEMENT_INACTIVE",
    "activeSubscriptionStatuses.has(subscriptionStatus)",
    "activeSubscriptionStatuses.has(organizationAppStatus)",
  ]) assert.ok(server.includes(token),'missing '+token);
});

test('non-global access requires canonical membership and individual NestLocal authorization',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf('function resolveNestLocalAccess');
  const end=server.indexOf('const upload=',start);
  const block=server.slice(start,end);
  for(const token of [
    "MEMBERSHIP_NOT_FOUND",
    "MEMBERSHIP_INACTIVE",
    "member.appAccess?.nestlocal",
    "organizationRole==='owner'",
    "memberAccess?.enabled!==true",
    "MEMBER_APP_ACCESS_DISABLED",
    "member.permissions?.['nestlocal.manage']===true",
    "PERMISSION_DENIED",
  ]) assert.ok(block.includes(token),'missing '+token);
});

test('global ecosystem roles keep administrative full access without subscription or membership dependency',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf('function resolveNestLocalAccess');
  const end=server.indexOf('const upload=',start);
  const block=server.slice(start,end);
  assert.ok(block.includes('administrative=globalRoles.has(systemRole)'));
  assert.ok(block.includes("if(administrative)return{accessible:true"));
  assert.ok(block.includes("plan:'pro'"));
});

test('session projection and protected API share the same resolver',()=>{
  const server=read('../server.mjs');
  const sessionStart=server.indexOf("app.get('/api/session'");
  const sessionEnd=server.indexOf("app.get('/api/organizations/:orgId/nestlocal'",sessionStart);
  const authStart=server.indexOf('async function authorize');
  const authEnd=server.indexOf('async function getPublicEntitlement',authStart);
  assert.ok(server.slice(sessionStart,sessionEnd).includes('resolveNestLocalAccess('));
  assert.ok(server.slice(authStart,authEnd).includes('resolveNestLocalAccess('));
  assert.ok(server.slice(sessionStart,sessionEnd).includes('reason:access.reason'));
});

test('bootstrap relies on canonical authorize gate instead of stale enabledApps duplication',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/bootstrap'");
  const end=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/settings'",start);
  const block=server.slice(start,end);
  assert.equal(block.includes("enabledApps.includes('nestlocal')"),false);
  assert.ok(block.includes('authenticate,authorize'));
});

test('public storefront requires both subscription and organization app entitlement',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf('async function getPublicEntitlement');
  const end=server.indexOf('async function resolveOrganization',start);
  const block=server.slice(start,end);
  assert.ok(block.includes('nestLocalEntitlement('));
  assert.ok(block.includes('active:entitlement.active'));
});
