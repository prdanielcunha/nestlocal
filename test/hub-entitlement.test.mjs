import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHubNestLocalTrial,canNestLocalMutate,TRIAL_DURATION_MS,isUnlimitedRequestsEnabled }
  from '../src/domain/hub-entitlement.mjs';

test('168 hours UTC / expiry ignores device clock and denies writes',()=>{
  const start=Date.parse('2026-10-08T12:00:00Z');
  const grant={appId:'nestlocal',organizationId:'org-A',source:'hub_internal_trial',status:'active',
    consumed:true,revoked:false,grantVersion:2,
    beginsAt:{toMillis:()=>start},expiresAt:{toMillis:()=>start+TRIAL_DURATION_MS}};
  const active=resolveHubNestLocalTrial(grant,{status:'trialing'},start+1000,'org-A');
  assert.equal(active?.subscriptionStatus,'internal_trial_active');
  assert.equal(canNestLocalMutate(active,'POST'),true);
  const ended=resolveHubNestLocalTrial(grant,{status:'trialing'},start+TRIAL_DURATION_MS,'org-A');
  assert.equal(ended?.subscriptionStatus,'internal_trial_expired');
  assert.equal(ended?.readOnly,true);
  assert.equal(canNestLocalMutate(ended,'GET'),true);
  assert.equal(canNestLocalMutate(ended,'PATCH'),false);
  assert.equal(canNestLocalMutate(ended,'POST'),false);
  assert.equal(canNestLocalMutate(ended,'DELETE'),false);
  assert.equal(ended?.canUseAI,false);
  assert.equal(resolveHubNestLocalTrial({...grant,revoked:true},{status:'trialing'},start+1000,'org-A'),null);
  assert.equal(resolveHubNestLocalTrial({...grant,source:'stripe'},{status:'trialing'},start+1000,'org-A'),null);
  assert.equal(resolveHubNestLocalTrial({...grant,grantVersion:1},{status:'trialing'},start+1000,'org-A'),null);
  assert.equal(resolveHubNestLocalTrial({...grant,expiresAt:{toMillis:()=>start+TRIAL_DURATION_MS+1000}},{status:'trialing'},start+1000,'org-A'),null);
  assert.equal(resolveHubNestLocalTrial(grant,{status:'inactive'},start+1000,'org-A'),null);
  assert.equal(resolveHubNestLocalTrial(grant,{status:'trialing'},start+1000,'org-B'),null);
});
test('Fair-use feature flag defaults to OFF; never implicitly enables unlimited requests',()=>{
  assert.equal(isUnlimitedRequestsEnabled({}),false);
  assert.equal(isUnlimitedRequestsEnabled({NESTLOCAL_FAIR_USE_V2_ENABLED:'true'}),true);
  assert.equal(isUnlimitedRequestsEnabled({NESTLOCAL_FAIR_USE_V2_ENABLED:'false'}),false);
});

test('Hub manual extension adds at most seven calendar days; expired accounts require paid checkout',()=>{
  const start=Date.parse('2026-10-08T12:00:00Z'),baseEnd=start+TRIAL_DURATION_MS,day=86_400_000;
  const grant={appId:'nestlocal',organizationId:'org-A',source:'hub_internal_trial',
    status:'active',consumed:true,grantVersion:2,
    beginsAt:{toMillis:()=>start},expiresAt:{toMillis:()=>baseEnd},
    extensionCount:1,extensionDays:7,extensionEndsAt:{toMillis:()=>baseEnd+7*day}};
  const extended=resolveHubNestLocalTrial(grant,{status:'trialing'},baseEnd+1,'org-A');
  assert.equal(extended?.readOnly,false);
  assert.equal(extended?.endsAt,new Date(baseEnd+7*day).toISOString());
  assert.equal(canNestLocalMutate(extended,'POST'),true);
  const expired=resolveHubNestLocalTrial(grant,{status:'trialing'},baseEnd+7*day,'org-A');
  assert.equal(expired?.readOnly,true);
  assert.equal(canNestLocalMutate(expired,'POST'),false);
  assert.equal(canNestLocalMutate(expired,'GET'),true);
  assert.equal(resolveHubNestLocalTrial({...grant,extensionDays:8},{status:'trialing'},baseEnd+1,'org-A'),null);
  assert.equal(resolveHubNestLocalTrial({...grant,extensionEndsAt:{toMillis:()=>baseEnd+8*day}},
    {status:'trialing'},baseEnd+1,'org-A'),null);
  assert.equal(resolveHubNestLocalTrial({...grant,extensionCount:2},{status:'trialing'},baseEnd+1,'org-A'),null);
});
