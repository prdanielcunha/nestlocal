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
