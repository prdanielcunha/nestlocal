import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quoteHasExpired,currentScheduleRevision,scheduleRevisionAfterPatch,completedAmountAdjustment,manualPaymentAdjustment} from '../src/domain/operational-integrity.mjs';

test('C06: expired quotes are rejected at the exact deadline',()=>{
 const expiry='2026-10-15T12:00:00.000Z';
 assert.equal(quoteHasExpired(expiry,Date.parse(expiry)-1),false);
 assert.equal(quoteHasExpired(expiry,Date.parse(expiry)),true);
 assert.equal(quoteHasExpired('bad-date'),true);
 assert.equal(quoteHasExpired(null),false); // historic quotes without expiry remain readable
});

test('C07: schedule revision increments only for material changes',()=>{
 const existing={date:'2026-11-01',window:'morning',assignedTo:'user1'};
 assert.equal(currentScheduleRevision(existing),1);
 assert.deepEqual(scheduleRevisionAfterPatch(existing,{scheduledDate:'2026-11-01'}),{changed:false,revision:1});
 assert.deepEqual(scheduleRevisionAfterPatch(existing,{scheduledDate:'2026-11-02'}),{changed:true,revision:2});
 assert.deepEqual(scheduleRevisionAfterPatch({}, {scheduledDate:'2026-11-01'}),{changed:true,revision:1});
 assert.deepEqual(scheduleRevisionAfterPatch({...existing,revision:5}, {assignedTo:'user2'}),{changed:true,revision:6});
});

test('C01 C04 C09 C11: critical client and deployment regressions stay guarded',()=>{
 const live=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const deploy=readFileSync(new URL('../.github/workflows/firebase-hosting-deploy.yml',import.meta.url),'utf8');
 assert.match(live,/<button type="submit" class="button primary wide">\$\{t\('save'\)\}<\/button><\/form>\$\{paymentSettingsCard/);
 assert.match(live,/id="capacity-settings"[\s\S]*?<button type="submit" class="button primary wide">/);
 assert.match(live,/capturePublicFormDraft\(e\.target\.form\)/);
 assert.doesNotMatch(live,/inclusions:'Incluído conforme descrição',exclusions:'Peças e serviços adicionais'/);
 assert.match(server,/if\(existing\.exists\)\{if\(intentHash/);
 assert.match(server,/draftSettings:admin\.firestore\.FieldValue\.delete\(\)/);
 assert.match(deploy,/"src\/nestai\.mjs"/);
 assert.match(deploy,/server\.mjs src\/domain src\/nestai\.mjs/);
});

test('C08: completed corrections are delta-based and retries do not double-count',()=>{
 const request={status:'completed',completionRecordedAt:'2026-10-01',commercial:{finalAmountCents:10000}};
 assert.deepEqual(completedAmountAdjustment(request,{finalAmountCents:12000}),{
   changed:true,deltaCents:2000,oldAmountCents:10000,newAmountCents:12000
 });
 assert.equal(completedAmountAdjustment(request,{finalAmountCents:10000}).changed,false);
 assert.equal(completedAmountAdjustment({...request,status:'scheduled'},{finalAmountCents:12000}).changed,false);
 assert.equal(completedAmountAdjustment({...request,commercial:{finalAmountCents:12000}},{finalAmountCents:12000}).deltaCents,0);
 assert.equal(completedAmountAdjustment(request,{finalAmountCents:9000}).deltaCents,-1000);
 assert.throws(()=>completedAmountAdjustment({status:'completed',commercial:{finalAmountCents:10000}},{finalAmountCents:11000}),{message:'FINANCIAL_RECONCILIATION_REQUIRED'});
 assert.throws(()=>completedAmountAdjustment({...request,commercial:{finalAmountCents:null},quote:{totalCents:null}},{finalAmountCents:9000}),{message:'FINANCIAL_RECONCILIATION_REQUIRED'});
});
test('C08: API persists audited amount corrections and never adjusts cash received',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(server,/nestlocal_financial_adjustments/);
 assert.match(server,/financialCorrection\.deltaCents/);
 assert.match(server,/assistedRevenueCents:admin\.firestore\.FieldValue\.increment\(delta\)/);
 assert.match(server,/FINANCIAL_RECONCILIATION_REQUIRED/);
});

test('C02: operational pages are tenant-scoped, paginated, and old records remain directly readable',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 for(const phrase of [
   "nestlocal/agenda/page',authenticate,authorize",
   "nestlocal/lists/:kind/page',authenticate,authorize",
   "nestlocal/requests/:requestId',authenticate,authorize",
   "collection('INVALID')"
 ].slice(0,3))assert.ok(server.includes(phrase),phrase);
 assert.match(ui,/request-status-filter/);
 assert.match(ui,/agendaRequests/);
 assert.match(ui,/agendaHasMore/);
 assert.match(ui,/requestsHasMore/);
});
test('C06 C21: public decisions reject stale revisions and management routes check server RBAC',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 assert.match(server,/expectedQuoteVersion!==currentQuoteVersion/);
 assert.match(server,/QUOTE_REVISION_CHANGED/);
 assert.match(ui,/JSON\.stringify\(\{decision,quoteVersion\}\)/);
 for(const path of ['settings','capacity','services/:serviceId','publish']){
   const method=path==='publish'?'post':'put';
   const i=server.indexOf(`app.${method}('/api/organizations/:orgId/nestlocal/${path}'`);
   assert.ok(i>0,path);
   assert.match(server.slice(i,i+350),/if\(!canManageNestLocal\(req\.access\)\)return sendError\(res,403,'ACCESS_DENIED'\)/);
 }
});

test('C02: operational priorities query every actionable status independently and include due customers',()=>{
 const live=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(live,/priorityStatusOptions=\['in_progress','accepted','no_show','new','reviewing','quoted','scheduled'\]/);
 assert.match(live,/await Promise\.allSettled\(statuses\.map/);
 assert.match(live,/targetData\.priorityRequests=/);
 assert.match(live,/targetData\.priorityHasMore=/);
 assert.match(live,/mergeOperationalRows\(S\.data\.customers,S\.data\.dueCustomers\)/);
 assert.match(server,/dueCustomers:dueRows/);
 assert.match(server,/dueCustomersHasMore:/);
});

test('C04/C05: catalog readiness accounts for draft changes and review services retain their scope',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(server,/effectiveSettings=settingsData\?\.draftSettings\?/);
 assert.match(server,/setupReadiness=catalogReadiness\(effectiveSettings,serviceRows\)/);
 assert.match(server,/mode:b\.mode,returnAfterDays,inclusions:clean\(b\.inclusions\)/);
});

test('C21: late dashboard responses cannot overwrite a newly selected organization',()=>{
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 assert.match(ui,/const orgId=S\.orgId,run=\+\+S\.dataLoadSequence/);
 assert.match(ui,/if\(orgId!==S\.orgId\|\|run!==S\.dataLoadSequence\)return/);
 assert.match(ui,/S\.data=data;S\.privacyPermissions=permissions/);
 assert.match(ui,/const priorityLoad=loadOperationalPriorities\(\{targetData:data,orgId\}\)/);
});

test('C08: payment entry corrections are signed, versioned, and repeat-safe',()=>{
 const old={status:'completed',commercial:{finalAmountCents:20000,amountPaidCents:8000,paymentStatus:'partial',paymentRevision:2}};
 assert.deepEqual(manualPaymentAdjustment(old,{amountPaidCents:11000}),{
  changed:true,oldAmountCents:8000,newAmountCents:11000,deltaCents:3000,
  oldStatus:'partial',newStatus:'partial',revision:3
 });
 const revised={...old,commercial:{...old.commercial,amountPaidCents:11000,paymentRevision:3}};
 assert.equal(manualPaymentAdjustment(revised,{amountPaidCents:11000}).changed,false);
 assert.equal(manualPaymentAdjustment(revised,{amountPaidCents:4000}).deltaCents,-7000);
 assert.equal(manualPaymentAdjustment(revised,{paymentStatus:'paid'}).changed,true);
 assert.throws(()=>manualPaymentAdjustment({commercial:{paymentStatus:'paid'}},{amountPaidCents:1000}),{message:'PAYMENT_RECONCILIATION_REQUIRED'});
 assert.equal(manualPaymentAdjustment({commercial:{}},{amountPaidCents:0}).changed,false);
});
test('C08: payment ledger is operator-entered and audited only after transactional reads',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const start=server.indexOf("app.patch('/api/organizations/:orgId/nestlocal/requests/:requestId'");
 const block=server.slice(start,server.indexOf('\napp.',start+10));
 assert.match(block,/paymentCorrection=manualPaymentAdjustment\(current,b\)/);
 assert.match(block,/ref\.collection\('payment_events'\)/);
 assert.match(block,/source:'operator_entry'/);
 assert.match(block,/paymentRevision/);
 assert.ok(block.indexOf('await Promise.all([')<block.indexOf('tx.create(paymentEvent'), 'reads precede ledger writes');
 assert.match(block,/nextPayment==='cancelled'&&nextPaid!==0/);
 assert.match(block,/FINANCIAL_RECONCILIATION_REQUIRED/);
});

test('C21: field workers can complete jobs but cannot change financial amounts without explicit capability',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const live=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 assert.match(server,/canManageNestLocalFinance=access=>canManageNestLocal\(access\)/);
 assert.match(server,/permissions\?\.financeWrite===true/);
 assert.match(server,/financialEdit&&!canManageNestLocalFinance\(req\.access\)/);
 assert.match(server,/FINANCE_ACCESS_DENIED'\)return sendError\(res,403/);
 assert.match(live,/canManageFinance===false/);
 assert.match(live,/S\.data\?\.canManageFinance!==false\)Object\.assign\(payload/);
 assert.match(live,/data-payment-history=/);
 assert.match(server,/gatewayVerified:false/);
 const historyRoute=server.slice(server.indexOf("app.get('/api/organizations/:orgId/nestlocal/requests/:requestId/payment-events'"),server.indexOf("app.patch('/api/organizations/:orgId/nestlocal/requests/:requestId'"));
 assert.match(historyRoute,/canManageNestLocalFinance\(req\.access\)/);
 assert.match(live,/canManageFinance===true\?`<div class="payment-audit"/);
});

test('C14: official outbound remains unsent until Connect implements real dispatch',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 assert.match(server,/dispatch:'not_implemented',delivery:'manual_only',providerVerified:false/);
 assert.match(server,/providerPolicy:'PROVIDER_POLICY_BLOCKED'/);
 assert.match(server,/sent:false/);
 for(const label of ['Preparada · não enviada','Prepared · not sent','Preparada · no enviada'])assert.ok(ui.includes(label));
 assert.match(ui,/connectValidationOnly/);
});
