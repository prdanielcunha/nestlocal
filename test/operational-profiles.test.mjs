import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalOperationalProfile,operationalRouteAllowed,fieldRequestView} from '../src/domain/operational-profiles.mjs';
import {prepareNestLocalMemberAccess,nestLocalCapability} from '../src/domain/member-permissions.mjs';
const member=profile=>({appAccess:{nestlocal:{profile,capabilities:{financeWrite:true,sitesWrite:true}}}});
test('canonical profiles fail closed and cannot reduce administrator authority or broaden legacy access implicitly',()=>{
 assert.equal(canonicalOperationalProfile({}),'legacy');assert.equal(canonicalOperationalProfile(member('unknown')),'restricted');
 assert.equal(canonicalOperationalProfile(member('viewer'),{administrator:true}),'admin');
 assert.throws(()=>prepareNestLocalMemberAccess({},true,undefined,'admin'),/INVALID_MEMBER_PROFILE/);
 assert.equal(prepareNestLocalMemberAccess({profile:'field'},false).profile,'field');
 for(const profile of ['field','viewer','unknown'])for(const key of ['financeWrite','sitesWrite'])assert.equal(nestLocalCapability(member(profile),key),false);
 assert.equal(nestLocalCapability(member('finance'),'financeWrite'),true);assert.equal(nestLocalCapability(member('finance'),'sitesWrite'),false);
});
test('field profile only reads assigned-work surfaces and accepts execution-only mutation shapes',()=>{
 for(const path of ['', '/lists/requests/page','/agenda/page','/requests/job','/requests/job/photos/0','/requests/job/evidence/0'])assert.equal(operationalRouteAllowed('field','GET',path),true,path);
 for(const path of ['/lists/customers/page','/customers/id/sites','/data-export/requests','/action-tasks','/opportunity-drafts','/privacy/permissions','/requests/job/payment-events'])assert.equal(operationalRouteAllowed('field','GET',path),false,path);
 assert.equal(operationalRouteAllowed('field','PATCH','/requests/job',{status:'in_progress',executionNotes:'Note'}),true);
 for(const body of [{amountPaidCents:1},{status:'accepted'},{assignedTo:'other'},{scheduledDate:'2026-11-01'},{}])assert.equal(operationalRouteAllowed('field','PATCH','/requests/job',body),false);
 for(const profile of ['field','viewer','finance'])assert.equal(operationalRouteAllowed(profile,'PUT','/team/member',{enabled:true}),false);
});
test('finance writes only monetary fields; viewer cannot mutate business records or invoke AI',()=>{
 assert.equal(operationalRouteAllowed('finance','PATCH','/requests/job',{paymentStatus:'paid',amountPaidCents:100}),true);
 assert.equal(operationalRouteAllowed('finance','PATCH','/requests/job',{status:'completed',amountPaidCents:100}),false);
 assert.equal(operationalRouteAllowed('finance','POST','/requests/job/quote'),true);
 assert.equal(operationalRouteAllowed('viewer','GET','/lists/requests/page'),true);
 for(const path of ['/customers/batch','/ai/request-extract','/messages/prepare','/requests/job/evidence'])assert.equal(operationalRouteAllowed('viewer','POST',path),false);
 for(const method of ['GET','POST','PATCH','DELETE'])assert.equal(operationalRouteAllowed('restricted',method,'/calendar/feed'),false);
 assert.equal(operationalRouteAllowed('viewer','DELETE','/push/devices'),true);
});
test('field request projection whitelists only job data and rejects another assignee',()=>{
 const record={status:'scheduled',customer:{name:'Example',phone:'5511999999999',email:'private@example.test'},schedule:{assignedTo:'worker',date:'2026-11-01'},quote:{totalCents:123456},commercial:{amountPaidCents:1234},trackingTokenHash:'secret',customerId:'customer',internalFinanceNotes:'secret',execution:{checklist:[{id:'one',label:'Step',done:false,privateCost:123}]},workEvidence:[{path:'private/path',contentType:'image/jpeg'}]};
 assert.throws(()=>fieldRequestView('job',record,'other'),/ASSIGNMENT_ACCESS_DENIED/);
 const visible=fieldRequestView('job',record,'worker');
 for(const key of ['quote','commercial','trackingTokenHash','customerId','internalFinanceNotes'])assert.equal(Object.hasOwn(visible,key),false);
 assert.equal(visible.customer.email,undefined);assert.equal(visible.workEvidence[0].path,undefined);assert.equal(visible.execution.checklist[0].privateCost,undefined);
 assert.equal(visible.customer.name,'Example');assert.equal(visible.schedule.date,'2026-11-01');
});
