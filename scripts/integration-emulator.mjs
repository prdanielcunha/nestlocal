// Runs the actual API and Admin SDK against an isolated Firestore emulator.
// No production credentials, Google login bypass or external delivery is used.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {createECDH} from 'node:crypto';
import webpush from 'web-push';
import {once} from 'node:events';
import {mkdirSync} from 'node:fs';
import admin from 'firebase-admin';
import express from 'express';

const projectId='demo-nestlocal-integration',coreOnly=process.argv.includes('--core-only');
assert.equal(process.env.FIREBASE_PROJECT_ID,projectId,'Only the synthetic demo project is allowed');
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/,'A loopback emulator is mandatory');
assert.ok(!process.env.GOOGLE_APPLICATION_CREDENTIALS,'Do not supply cloud credentials');
const app=admin.initializeApp({projectId}),db=admin.firestore();
const orgId='integration-a',root=`organizations/${orgId}`,apiPort=18186;
const token=randomBytes(32).toString('base64url'),ownerToken=`nl_${token}`;
const memberToken=`nl_${randomBytes(32).toString('base64url')}`;
const hash=value=>createHash('sha256').update(value).digest('hex');
const syntheticPush=webpush.generateVAPIDKeys();
let server,logs='';
async function call(path,method='GET',body,auth=ownerToken,expected=200,extraHeaders={}){
 const response=await fetch(`http://127.0.0.1:${apiPort}/api/organizations/${orgId}/nestlocal${path}`,{
  method,headers:{authorization:`Bearer ${auth}`,'content-type':'application/json',...extraHeaders},
  ...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json();
 assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(result)}`);
 return result;
}
async function seedSession(uid,auth,role){
 await db.doc(`users/${uid}`).set({status:'active',ecosystemSessionVersion:1});
 await db.doc(`${root}/members/${uid}`).set({role,status:'active',appAccess:{nestlocal:{enabled:true,permissions:['nestlocal.manage']}}});
 await db.doc(`nestlocal_sessions/${hash(auth)}`).set({uid,organizationId:orgId,appId:'nestlocal',status:'active',sessionVersion:1,expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+3600000)});
}
async function check(name,fn,extended=false){if(coreOnly&&extended)return;await fn();console.log(`PASS ${name}`)}
try{
 await db.doc(root).set({name:'Synthetic business',status:'active',apps:{nestlocal:{status:'active',plan:'pro'}}});
 await db.doc('organizations/integration-b').set({name:'Other synthetic tenant'});
 await db.doc(`subscriptions/${orgId}`).set({apps:{nestlocal:{status:'active',plan:'pro'}}});
 await seedSession('integration-owner',ownerToken,'owner');
 await seedSession('integration-field',memberToken,'member');
 await db.doc(`${root}/nestlocal_settings/public`).set({timezone:'UTC',capacity:{workingDays:[1],windows:['morning'],custom:'preserved'}});
 // Explicit safe environment: no inherited delivery credentials/flags.
 server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{
  PATH:process.env.PATH,HOME:process.env.HOME,PORT:String(apiPort),
  FIREBASE_PROJECT_ID:projectId,FIRESTORE_EMULATOR_HOST:process.env.FIRESTORE_EMULATOR_HOST,
  GCLOUD_PROJECT:projectId,NESTLOCAL_PUSH_ENABLED:'false',NESTLOCAL_HUB_ENTITLEMENT_V3_ENABLED:'false',
  NESTLOCAL_NATIVE_PUSH_ENABLED:'true',NESTLOCAL_NATIVE_PUSH_PUBLIC_KEY:syntheticPush.publicKey,NESTLOCAL_NATIVE_PUSH_PRIVATE_KEY:syntheticPush.privateKey
 },stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',b=>{logs+=b});server.stderr.on('data',b=>{logs+=b});
 for(let i=0;i<100;i++){
  try{await fetch(`http://127.0.0.1:${apiPort}/health`);break}catch{}
  if(server.exitCode!==null)throw Error(`API failed: ${logs}`);
  await new Promise(r=>setTimeout(r,100));
 }
 await check('audio transcription validates canonical scope, consent and durable daily quota before provider access',async()=>{
  const post=async(consent='true',targetOrg=orgId,auth=ownerToken)=>{
   const bytes=Buffer.alloc(44);bytes.write('RIFF');bytes.write('WAVE',8);
   const body=new FormData();body.append('audio',new Blob([bytes],{type:'audio/wav'}),'synthetic.wav');body.append('consent',consent);body.append('locale','pt');
   return fetch(`http://127.0.0.1:${apiPort}/api/organizations/${targetOrg}/nestlocal/ai/audio-transcribe`,{method:'POST',headers:{authorization:`Bearer ${auth}`},body});
  };
  assert.equal((await post('false')).status,400);
  assert.equal((await post('true','integration-b')).status,403);
  assert.equal((await post('true',orgId,'missing')).status,401);
  const date=new Date().toISOString().slice(0,10),quota=db.doc(`${root}/nestlocal_ai_audio_usage/${date}`);await quota.set({count:5});
  const response=await post();assert.equal(response.status,429);assert.equal((await response.json()).error,'AI_DAILY_BUDGET_REACHED');assert.equal((await quota.get()).data().count,5);
 });
 await check('capacity persists nested values and preserves unrelated configuration',async()=>{
  await call('/capacity','PUT',{timezone:'America/Sao_Paulo',workingDays:[2,4],windows:['afternoon']});
  const saved=(await db.doc(`${root}/nestlocal_settings/public`).get()).data();
  assert.deepEqual(saved.capacity,{workingDays:[2,4],windows:['afternoon'],custom:'preserved'});
  assert.ok(!Object.hasOwn(saved,'capacity.workingDays'));
 });
 await check('cross-tenant session is rejected and financial writes remain protected',async()=>{
  const response=await fetch(`http://127.0.0.1:${apiPort}/api/organizations/integration-b/nestlocal`,{headers:{authorization:`Bearer ${ownerToken}`}});
  assert.equal(response.status,403);assert.equal((await response.json()).error,'SESSION_ORGANIZATION_MISMATCH');
  if(coreOnly)return;
  await db.doc(`${root}/nestlocal_requests/finance`).set({status:'reviewing',quote:{totalCents:10000},commercial:{paymentStatus:'pending',amountPaidCents:0}});
  await call('/requests/finance','PATCH',{amountPaidCents:3000,paymentStatus:'partial'},memberToken,403);
  assert.equal((await db.doc(`${root}/nestlocal_requests/finance`).get()).data().commercial.amountPaidCents,0);
 });
 await check('team revocation changes canonical and legacy membership and blocks existing session',async()=>{
  await call('/team/integration-field','PUT',{enabled:false});
  for(const path of [`${root}/members/integration-field`,`organization_members/${orgId}_integration-field`]){
   const saved=(await db.doc(path).get()).data();
   assert.equal(saved.appAccess.nestlocal.enabled,false);
   assert.ok(!Object.hasOwn(saved,'appAccess.nestlocal'));
  }
  await call('','GET',undefined,memberToken,403);
  await call('/team/integration-field','PUT',{enabled:true});
  await call('','GET',undefined,memberToken);
 });
 await check('canonical capability grants, revocations and seat toggles enforce API writes without escalation',async()=>{
  await call('/team/integration-field','PUT',{enabled:true,capabilities:{financeWrite:true}},memberToken,403);
  await call('/team/integration-field','PUT',{enabled:true,capabilities:{admin:true}},ownerToken,400);
  await call('/team/integration-field','PUT',{},ownerToken,400);
  await db.doc(`${root}/members/integration-field`).set({appAccess:{nestlocal:{permissions:{'nestlocal.manage':true,financeWrite:true,sitesWrite:true}}}},{merge:true});
  assert.equal((await call('','GET',undefined,memberToken)).canManageFinance,true);
  await call('/team/integration-field','PUT',{enabled:false});
  await call('','GET',undefined,memberToken,403);
  await call('/team/integration-field','PUT',{enabled:true});
  assert.equal((await call('','GET',undefined,memberToken)).canManageSites,true);
  await call('/team/integration-field','PUT',{enabled:true,capabilities:{financeWrite:false,sitesWrite:false}});
  const revoked=await call('','GET',undefined,memberToken);
  assert.equal(revoked.canManageFinance,false);assert.equal(revoked.canManageSites,false);assert.equal(revoked.canManageTeam,false);
  await db.doc(`${root}/nestlocal_requests/capability`).set({status:'reviewing',serviceId:'service',quantity:1,quote:{totalCents:10000},commercial:{paymentStatus:'pending',amountPaidCents:0}});
  await call('/requests/capability/quote','POST',{amountCents:10000},memberToken,403);
  await call('/requests/capability','PATCH',{amountPaidCents:1000,paymentStatus:'partial'},memberToken,403);
  await call('/customers/no-customer/sites','POST',{label:'Sample',line:'Sample road',city:'Sample',equipment:[]},memberToken,403);
  await call('/team/integration-field','PUT',{enabled:true,capabilities:{financeWrite:true}});
  await call('/requests/capability/quote','POST',{amountCents:10000,expectedQuoteVersion:1},memberToken);
  await call('/requests/capability','PATCH',{amountPaidCents:1000,paymentStatus:'partial'},memberToken);
  assert.equal((await db.doc(`${root}/nestlocal_requests/capability`).get()).data().commercial.amountPaidCents,1000);
  for(const path of [`${root}/members/integration-field`,`organization_members/${orgId}_integration-field`]){
   const access=(await db.doc(path).get()).data().appAccess.nestlocal;
   assert.equal(access.permissions.sitesWrite,true);assert.equal(access.capabilities.financeWrite,true);assert.equal(access.capabilities.sitesWrite,false);
  }
  await call('/team/integration-owner','PUT',{enabled:false},ownerToken,409);
  await call('/team/integration-field','PUT',{enabled:true,capabilities:{financeWrite:false}});
 },true);
 await check('customer import previews, date rejection, retries and stale conflicts preserve existing data and consent',async()=>{
  const customerPhone='5511912345678',id=hash(customerPhone).slice(0,28),ref=db.doc(`${root}/nestlocal_customers/${id}`);
  await ref.set({name:'Existing',phone:customerPhone,address:{line:'Existing road',city:'Existing city'},messaging:{consents:{maintenanceReminders:{accepted:true}}},updatedAt:admin.firestore.Timestamp.fromMillis(1000)});
  const customers=[{name:'Updated',phone:customerPhone,addressLine:'New road'},{name:'New customer',phone:'5511923456789',lastServiceDate:'2024-02-29'},
   {name:'Bad date',phone:'5511934567890',nextServiceDate:'2026-02-31'},{name:'Duplicate',phone:customerPhone},
   {name:'Trailing date',phone:'5511945678901',nextServiceDate:'2026-01-01invalid'}];
  const preview=await call('/customers/batch/preview','POST',{customers});
  assert.deepEqual(preview.counts,{create:1,update:1,invalid:2,duplicate:1});
  assert.equal((await ref.get()).data().name,'Existing');
  const payload={customers,preflightRows:preview.rows,requestKey:'synthetic-import-key-001'};
  const results=await Promise.all([call('/customers/batch','POST',payload,ownerToken,201),call('/customers/batch','POST',payload,ownerToken,201)]);
  assert.equal(results[0].createdCount,1);assert.equal(results[0].updatedCount,1);assert.equal(results[0].skippedCount,3);
  assert.deepEqual(results[0],results[1]);
  const saved=(await ref.get()).data();assert.equal(saved.address.line,'New road');assert.equal(saved.address.city,'Existing city');
  assert.equal(saved.messaging.consents.maintenanceReminders.accepted,true);
  assert.equal((await db.doc(`${root}/nestlocal_customers/${hash('5511923456789').slice(0,28)}`).get()).data().messaging,undefined);
  const events=await db.collection(`${root}/nestlocal_audit`).where('action','==','customers.batch_import').get();
  assert.equal(events.size,1);assert.equal(events.docs[0].data().phone,undefined);
  await call('/customers/batch','POST',{...payload,customers:[{...customers[0],name:'Changed'}]},ownerToken,409);
  const stale=await call('/customers/batch/preview','POST',{customers:[customers[0]]});
  await ref.update({name:'Concurrent change',updatedAt:admin.firestore.Timestamp.now()});
  await call('/customers/batch','POST',{customers:[customers[0]],preflightRows:stale.rows,requestKey:'synthetic-import-key-002'},ownerToken,409);
  assert.equal((await ref.get()).data().name,'Concurrent change');
 },true);
 await check('payment retries do not duplicate audit events; reversal reconciles deltas',async()=>{
  const patch={amountPaidCents:3000,paymentStatus:'partial'};
  await Promise.all([call('/requests/finance','PATCH',patch),call('/requests/finance','PATCH',patch)]);
  const events=db.collection(`${root}/nestlocal_requests/finance/payment_events`);
  assert.equal((await events.get()).size,1);
  await call('/requests/finance','PATCH',{amountPaidCents:10000,paymentStatus:'paid'});
  await call('/requests/finance','PATCH',{amountPaidCents:0,paymentStatus:'pending'});
  const history=await events.get();assert.equal(history.size,3);
  assert.equal(history.docs.reduce((n,d)=>n+d.data().deltaCents,0),0);
  assert.equal((await db.doc(`${root}/nestlocal_requests/finance`).get()).data().commercial.paymentRevision,3);
 },true);
 await check('completed revenue corrections apply only their difference under retry',async()=>{
  await db.doc(`${root}/nestlocal_customers/revenue-customer`).set({lifetimeRevenueCents:10000});
  await db.doc(`${root}/nestlocal_requests/completed`).set({status:'completed',customerId:'revenue-customer',completionRecordedAt:admin.firestore.Timestamp.now(),quote:{totalCents:10000},commercial:{finalAmountCents:10000,paymentStatus:'pending',amountPaidCents:0}});
  await Promise.all([call('/requests/completed','PATCH',{finalAmountCents:12000}),call('/requests/completed','PATCH',{finalAmountCents:12000})]);
  assert.equal((await db.doc(`${root}/nestlocal_customers/revenue-customer`).get()).data().lifetimeRevenueCents,12000);
  assert.equal((await db.collection(`${root}/nestlocal_financial_adjustments`).get()).size,1);
 },true);
 await check('pagination reaches an old pending request beyond 100 recent records',async()=>{
  const batch=db.batch();
  for(let i=0;i<125;i++)batch.set(db.doc(`${root}/nestlocal_requests/volume-${String(i).padStart(3,'0')}`),{status:'new',createdAt:admin.firestore.Timestamp.fromMillis(1000+i),trackingTokenHash:'must-not-leak'});
  await batch.commit();
  let cursor='',ids=[];
  do{const result=await call(`/lists/requests/page?status=new&limit=50${cursor?`&cursor=${cursor}`:''}`);
   assert.equal(result.totalCount,125);assert.ok(result.items.every(x=>!('trackingTokenHash' in x)));
   ids.push(...result.items.map(x=>x.id));cursor=result.nextCursor||'';
  }while(cursor);
  assert.equal(ids.length,125);assert.equal(new Set(ids).size,125);assert.ok(ids.includes('volume-000'));
 },true);
 await check('public maintenance consent is readable at its canonical nested path',async()=>{
  await db.doc('nestlocal_public_stores/integration-store').set({organizationId:orgId});
  await db.doc(`${root}/nestlocal_settings/public`).set({published:true,businessName:'Synthetic business',catalogVersion:'integration-v1',coverageCodes:['test-city'],validForMinutes:30},{merge:true});
  await db.doc(`${root}/nestlocal_services/clean`).set({published:true,name:'Synthetic cleaning',mode:'fixed',unitPriceCents:10000,durationMinutes:60,maxQuantity:4,equipmentTypes:['split'],inclusions:'Synthetic scope',exclusions:'Synthetic exclusions'});
  const response=await fetch(`http://127.0.0.1:${apiPort}/api/public/stores/integration-store/requests`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
   name:'Synthetic customer',phone:'11999990001',serviceId:'clean',coverageCode:'test-city',quantity:1,addressLine:'Synthetic address',preferredDate:'2099-01-01',preferredWindow:'morning',acceptedTerms:true,equipmentType:'split',safeAccess:true,whatsappMaintenanceOptIn:true
  })});
  const body=await response.json();assert.equal(response.status,201,JSON.stringify(body));
  const customerId=hash('11999990001').slice(0,28),saved=(await db.doc(`${root}/nestlocal_customers/${customerId}`).get()).data();
  assert.equal(saved.messaging?.consents?.maintenanceReminders?.accepted,true);
  assert.ok(!Object.hasOwn(saved,'messaging.consents.maintenanceReminders'));
 });
 await check('catalog drafts preserve live page and template connection until atomic publication',async()=>{
  await db.doc(`${root}/nestlocal_settings/public`).set({slug:'integration-store',publishedSlug:'integration-store',trustSetupVersion:2,communicationMode:'official',messaging:{connected:true,templates:{serviceUpdate:'old_template'}}},{merge:true});
  const settingsBody={businessName:'Revised synthetic business',slug:'integration-store',coverageCodes:['test-city'],validForMinutes:30,communicationMode:'official',contactEmail:'',contactPhone:'',whatsappServiceTemplate:'new_template',whatsappMaintenanceTemplate:'maintenance_template'};
  await call('/settings','PUT',settingsBody);
  let saved=(await db.doc(`${root}/nestlocal_settings/public`).get()).data();
  assert.equal(saved.businessName,'Synthetic business');assert.equal(saved.published,true);
  assert.equal(saved.draftSettings.messaging.templates.serviceUpdate,'new_template');
  assert.ok(!Object.hasOwn(saved.draftSettings,'messaging.templates.serviceUpdate'));
  const dashboard=await call('');assert.equal(dashboard.settings.messaging.connected,true);assert.equal(dashboard.setupReadiness.ready,true);
  await call('/services/clean','PUT',{name:'Revised synthetic service',mode:'review',returnAfterDays:30,inclusions:'Revised scope',exclusions:'Parts'});
  saved=(await db.doc(`${root}/nestlocal_services/clean`).get()).data();
  assert.equal(saved.name,'Synthetic cleaning');assert.equal(saved.published,true);
  await call('/publish','POST',{});
  saved=(await db.doc(`${root}/nestlocal_settings/public`).get()).data();
  assert.equal(saved.businessName,settingsBody.businessName);
  assert.equal(saved.messaging.connected,true);
  assert.equal(saved.messaging.templates.serviceUpdate,'new_template');
  assert.equal(saved.messaging.templates.maintenanceReminder,'maintenance_template');
  assert.ok(!saved.draftSettings);
  const published=(await db.doc(`${root}/nestlocal_services/clean`).get()).data();
  assert.equal(published.name,'Revised synthetic service');assert.ok(!published.draft);
  assert.equal(published.catalogVersion,saved.catalogVersion);
 },true);
 await check('manual creation retries produce one request and one usage increment',async()=>{
  const body={name:'Synthetic repeat customer',phone:'11999990003',serviceId:'clean',coverageCode:'test-city',quantity:1,equipmentType:'split',safeAccess:true,addressLine:'Synthetic address',preferredWindow:'flexible'};
  const before=(await db.doc(`${root}/nestlocal_usage/${new Date().toISOString().slice(0,7)}`).get()).data()?.requestCount||0;
  const headers={'Idempotency-Key':'integration-manual-retry'};
  const first=await call('/requests','POST',body,ownerToken,201,headers);
  const again=await call('/requests','POST',body,ownerToken,200,headers);
  assert.equal(first.requestId,again.requestId);
  assert.equal((await db.doc(`${root}/nestlocal_usage/${new Date().toISOString().slice(0,7)}`).get()).data().requestCount,before+1);
  await call('/requests','POST',{...body,note:'Changed intent'},ownerToken,409,headers);
 },true);
 await check('quote revisions, expiry and simultaneous approval preserve accepted price',async()=>{
  const ref=db.doc(`${root}/nestlocal_requests/lifecycle`);
  await ref.set({status:'new',serviceId:'clean',quantity:1,customerId:'lifecycle-customer',customer:{name:'Synthetic customer'},quote:{totalCents:null},commercial:{paymentStatus:'pending',amountPaidCents:0},createdAt:admin.firestore.Timestamp.now()});
  const first=await call('/requests/lifecycle/quote','POST',{amountCents:10000,expectedQuoteVersion:0,items:[{description:'Service',quantity:1,unitPriceCents:10000}]});
  assert.equal(first.quoteVersion,1);
  await call('/requests/lifecycle/quote','POST',{amountCents:12000,expectedQuoteVersion:0},ownerToken,409);
  const revised=await call('/requests/lifecycle/quote','POST',{amountCents:12000,expectedQuoteVersion:1});
  const link=await call('/requests/lifecycle/tracking-link','POST',{});
  const capability=new URL(link.trackingPath,'http://localhost').search;
  const decision=async(body,status=200)=>{
   const response=await fetch(`http://127.0.0.1:${apiPort}/api/public/requests/lifecycle/decision${capability}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result;
  };
  assert.equal((await decision({decision:'accepted',quoteVersion:1},409)).error,'QUOTE_REVISION_CHANGED');
  await ref.update({'quote.expiresAt':'2000-01-01T00:00:00.000Z'});
  assert.equal((await decision({decision:'accepted',quoteVersion:revised.quoteVersion},409)).error,'QUOTE_EXPIRED');
  await ref.update({'quote.expiresAt':'2099-01-01T00:00:00.000Z'});
  await Promise.all([decision({decision:'accepted',quoteVersion:2}),decision({decision:'accepted',quoteVersion:2})]);
  assert.equal((await ref.get()).data().decision.quoteTotalCents,12000);
  await call('/requests/lifecycle/quote','POST',{amountCents:13000,expectedQuoteVersion:2},ownerToken,409);
  assert.equal((await ref.collection('quote_versions').get()).size,2);
  // Keep the capability local to the synthetic test; never log or store a real token.
  await call('/requests/lifecycle','PATCH',{scheduledDate:'2099-02-31'},ownerToken,400);
  await call('/requests/lifecycle','PATCH',{warrantyUntil:'2099-13-01'},ownerToken,400);
  const schedule={status:'scheduled',scheduledDate:'2099-01-01',scheduledWindow:'afternoon',assignedTo:'integration-owner'};
  await call('/requests/lifecycle','PATCH',schedule);
  const confirmation=async(revision,status)=>{
   const response=await fetch(`http://127.0.0.1:${apiPort}/api/public/requests/lifecycle/schedule-confirmation${capability}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision:'confirmed',revision})});
   assert.equal(response.status,status,JSON.stringify(await response.json()));
  };
  await confirmation(1,201);
  await call('/requests/lifecycle','PATCH',{scheduledDate:'2099-01-02'});
  await confirmation(1,409);await confirmation(2,201);
  const saved=(await ref.get()).data();assert.equal(saved.schedule.customerConfirmation.revision,2);
  assert.equal(saved.schedule.confirmationHistory.length,1);
  await call('/requests/lifecycle','PATCH',{status:'in_progress'});
  await call('/requests/lifecycle','PATCH',{status:'completed',executionChecklist:[{id:'done',label:'Synthetic work',done:true}],finalAmountCents:12000});
  const completed=(await ref.get()).data();assert.ok(completed.completionRecordedAt);
  assert.equal((await db.doc(`${root}/nestlocal_customers/lifecycle-customer`).get()).data().lifetimeRevenueCents,12000);
 },true);
 await check('profiles isolate field data, enforce financial/viewer writes and revalidate reassignment',async()=>{
  const ownRef=db.doc(`${root}/nestlocal_requests/field-own`),otherRef=db.doc(`${root}/nestlocal_requests/field-other`),
   job={status:'scheduled',serviceId:'clean',quantity:1,customer:{name:'Assigned customer',phone:'5511999999999',email:'private@example.test'},address:{line:'Assigned road',city:'Test city'},schedule:{assignedTo:'integration-field',date:'2099-01-02',window:'morning'},quote:{totalCents:123456},commercial:{amountPaidCents:0,paymentStatus:'pending'},execution:{checklist:[{id:'first',label:'Inspect site',done:false}]},trackingTokenHash:'private-secret'};
  const batch=db.batch();batch.set(ownRef,job);batch.set(otherRef,{...job,schedule:{...job.schedule,assignedTo:'integration-owner'},customer:{name:'Other worker customer'}});
  for(let i=0;i<125;i++)batch.set(db.doc(`${root}/nestlocal_requests/assigned-${String(i).padStart(3,'0')}`),{...job,status:'completed'});
  await batch.commit();
  await call('/team/integration-field','PUT',{enabled:true,profile:'field'});
  const scoped=await call('','GET',undefined,memberToken);
  assert.equal(scoped.accessProfile,'field');for(const key of ['customers','team','messageOutbox'])assert.equal(scoped[key].length,0);
  assert.equal(scoped.requestsTotal,undefined);assert.equal(scoped.settings.payments,undefined);assert.equal(scoped.canManageFinance,false);
  let cursor='',rows=[];
  do{const page=await call('/lists/requests/page?limit=50'+(cursor?'&cursor='+cursor:''),'GET',undefined,memberToken);rows.push(...page.items);cursor=page.nextCursor||'';assert.equal(page.totalCount,null)}while(cursor);
  assert.equal(rows.length,126);assert.equal(new Set(rows.map(row=>row.id)).size,126);
  for(const row of rows){assert.equal(row.schedule.assignedTo,'integration-field');for(const key of ['quote','commercial','trackingTokenHash'])assert.equal(row[key],undefined);assert.equal(row.customer.email,undefined)}
  for(const path of ['/requests/field-other','/requests/field-other/photos/0','/requests/field-other/evidence/0'])await call(path,'GET',undefined,memberToken,404);
  const detail=await call('/requests/field-own','GET',undefined,memberToken);assert.equal(detail.item.quote,undefined);assert.equal(detail.item.customer.name,'Assigned customer');
  for(const path of ['/lists/customers/page','/customers/customer/sites','/data-export/requests','/opportunity-drafts','/pulse/feedback','/requests/field-own/payment-events'])await call(path,'GET',undefined,memberToken,403);
  for(const body of [{assignedTo:'integration-owner'},{amountPaidCents:1}])await call('/requests/field-own','PATCH',body,memberToken,403);
  await call('/requests/field-own/quote','POST',{amountCents:1},memberToken,403);
  await call('/team/integration-field','PUT',{enabled:true,profile:'legacy'},memberToken,403);
  await call('/requests/field-own','PATCH',{status:'in_progress',executionChecklist:[]},memberToken,403);
  assert.equal((await ownRef.get()).data().status,'scheduled');
  await call('/requests/field-own','PATCH',{status:'in_progress',executionNotes:'Work started',executionChecklist:[{id:'first',label:'Inspect site',done:true}]},memberToken);
  await call('/requests/field-own','PATCH',{status:'completed'},memberToken);
  assert.equal((await ownRef.get()).data().status,'completed');
  await ownRef.update({'schedule.assignedTo':'integration-owner'});
  await call('/requests/field-own','GET',undefined,memberToken,404);
  await call('/requests/field-own','PATCH',{executionNotes:'No longer assigned'},memberToken,404);
  await call('/team/integration-field','PUT',{enabled:true,profile:'viewer'});
  assert.equal((await call('','GET',undefined,memberToken)).accessProfile,'viewer');
  await call('/requests/field-other','GET',undefined,memberToken);
  await call('/requests/field-other','PATCH',{executionNotes:'Blocked'},memberToken,403);
  await call('/customers/batch','POST',{customers:[]},memberToken,403);
  await call('/ai/request-extract','POST',{},memberToken,403);
  await call('/team/integration-field','PUT',{enabled:true,profile:'finance'});
  assert.equal((await call('','GET',undefined,memberToken)).canManageFinance,true);
  await call('/requests/field-other','PATCH',{status:'completed'},memberToken,403);
  await call('/requests/field-other','PATCH',{amountPaidCents:100,paymentStatus:'partial'},memberToken);
  assert.equal((await otherRef.get()).data().commercial.amountPaidCents,100);
  await call('/customers/batch','POST',{customers:[]},memberToken,403);
  await call('/team/integration-field','PUT',{enabled:true,profile:'unknown'},ownerToken,400);
  await call('/team/integration-owner','PUT',{enabled:true,profile:'viewer'},ownerToken,409);
  await call('/team/integration-field','PUT',{enabled:true,profile:'legacy'});
 },true);
 await check('site imports preview, preserve conflicts, reject stale changes and retry atomically',async()=>{
  const customer='site-batch-test',base='/customers/'+customer+'/sites/import',ref=db.doc(`${root}/nestlocal_customers/${customer}`),
   site={label:'Main office',line:'Sample road 123',city:'Test city',notes:'Private notes',equipment:['AC room','AC hall']};
  await ref.set({name:'Site import sample',phone:'5511888888888',siteCount:0,createdAt:admin.firestore.Timestamp.now(),messaging:{consents:{maintenanceReminders:{accepted:false}}},lifetimeRevenueCents:12345});
  const preview=await call(base+'/preview','POST',{sites:[site]});
  assert.equal(preview.counts.create,1);assert.equal((await ref.collection('sites').get()).size,0);
  const payload={sites:[site],previewToken:preview.previewToken,operationKey:'nl-site-import-synthetic-0001'};
  const send=async(path,body)=>{
   const response=await fetch(`http://127.0.0.1:${apiPort}/api/organizations/${orgId}/nestlocal${path}`,{method:'POST',headers:{authorization:`Bearer ${ownerToken}`,'content-type':'application/json'},body:JSON.stringify(body)});
   return {status:response.status,body:await response.json()};
  };
  const responses=await Promise.all([send(base,payload),send(base,payload)]);
  assert.deepEqual(responses.map(x=>x.status).sort(),[200,201],JSON.stringify(responses));
  assert.ok(responses.every(x=>x.body.created===1));
  assert.equal((await ref.collection('sites').get()).size,1);assert.equal((await ref.get()).data().siteCount,1);
  assert.equal((await ref.get()).data().lifetimeRevenueCents,12345);
  assert.equal((await ref.get()).data().messaging.consents.maintenanceReminders.accepted,false);
  await call(base,'POST',{...payload,sites:[{...site,label:'Altered'}]},ownerToken,409);
  const unchanged=await call(base+'/preview','POST',{sites:[site]});assert.equal(unchanged.counts.existing,1);assert.equal(unchanged.canImport,false);
  const conflict=await call(base+'/preview','POST',{sites:[{...site,notes:'Different'}]});assert.equal(conflict.counts.conflict,1);
  await call(base,'POST',{sites:[{...site,notes:'Different'}],previewToken:conflict.previewToken,operationKey:'nl-site-import-synthetic-conflict'},ownerToken,409);
  const next={...site,label:'Branch'},stale=await call(base+'/preview','POST',{sites:[next]});
  const existing=(await ref.collection('sites').get()).docs[0];await existing.ref.update({notes:'Modified by another operator',revision:2});
  await call(base,'POST',{sites:[next],previewToken:stale.previewToken,operationKey:'nl-site-import-synthetic-stale'},ownerToken,409);
  assert.equal((await ref.collection('sites').get()).size,1);
  await call(base+'/preview','POST',{sites:[site]},memberToken,403);
  for(const profile of ['field','viewer','finance']){
   await call('/team/integration-field','PUT',{enabled:true,profile});
   await call(base+'/preview','POST',{sites:[site]},memberToken,403);
   await call(base,'POST',payload,memberToken,403);
  }
  await call('/team/integration-field','PUT',{enabled:true,profile:'legacy'});
  await call('/customers/no-such-customer/sites/import/preview','POST',{sites:[site]},ownerToken,404);
  const audit=await db.collection(`${root}/nestlocal_audit`).where('action','==','customers.sites_imported').get();
  const rows=audit.docs.filter(x=>x.data().customerId===customer);assert.equal(rows.length,1);
  assert.ok(!JSON.stringify(rows[0].data()).includes('Private notes'));assert.ok(!JSON.stringify(rows[0].data()).includes('Sample road'));
  // Only one of two different imports can consume the twentieth site slot.
  const full='site-batch-capacity',fullRef=db.doc(`${root}/nestlocal_customers/${full}`),fullPath='/customers/'+full+'/sites/import';
  await fullRef.set({name:'Capacity test',siteCount:19});
  const batch=db.batch();for(let i=0;i<19;i++)batch.set(fullRef.collection('sites').doc('old-'+i),{...site,label:'Existing '+i});await batch.commit();
  const a={...site,label:'New A'},b={...site,label:'New B'},pa=await call(fullPath+'/preview','POST',{sites:[a]}),pb=await call(fullPath+'/preview','POST',{sites:[b]});
  const competing=await Promise.all([send(fullPath,{sites:[a],previewToken:pa.previewToken,operationKey:'nl-site-import-capacity-aaaa'}),send(fullPath,{sites:[b],previewToken:pb.previewToken,operationKey:'nl-site-import-capacity-bbbb'})]);
  assert.deepEqual(competing.map(x=>x.status).sort(),[201,409],JSON.stringify(competing));
  assert.equal((await fullRef.collection('sites').get()).size,20);assert.equal((await fullRef.get()).data().siteCount,20);
 },true);
 await check('native push registration is user/tenant scoped, rejects SSRF and exposes no private key',async()=>{
  const config=await call('/push/config');assert.equal(config.transport,'web_push');assert.equal(config.eventNotificationsEnabled,true);assert.equal(config.scheduledRemindersEnabled,false);assert.equal(config.privateKey,undefined);
  const curve=createECDH('prime256v1');curve.generateKeys();const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-device',keys:{p256dh:curve.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
  const body={transport:'web_push',subscription,locale:'pt'},saved=await call('/push/devices','POST',body,ownerToken,201);assert.equal(saved.subscription,undefined);
  await call('/push/devices','POST',body,memberToken,409);
  await call('/push/devices','DELETE',{transport:'web_push',endpoint:subscription.endpoint},memberToken,403);
  await call('/push/devices','POST',{...body,subscription:{...subscription,endpoint:'https://localhost/private'}},ownerToken,400);
  await call('/push/devices','DELETE',{transport:'web_push',endpoint:subscription.endpoint});
  assert.equal((await db.collection(`${root}/nestlocal_web_push_devices`).get()).size,0);
 },true);
 await check('calendar imports use an optimistic schedule revision and preserve capacity/confirmation rules',async()=>{
  const ref=db.doc(`${root}/nestlocal_requests/calendar-import`);await ref.set({status:'scheduled',serviceId:'clean',schedule:{date:'2099-05-01',window:'morning',assignedTo:'integration-owner',revision:2,customerConfirmation:{status:'confirmed',revision:2}},customer:{name:'Synthetic'}});
  await call('/requests/calendar-import','PATCH',{scheduledDate:'2099-05-02',expectedScheduleRevision:1,expectedScheduleStatus:'scheduled'},ownerToken,409);
  assert.equal((await ref.get()).data().schedule.date,'2099-05-01');
  await call('/requests/calendar-import','PATCH',{scheduledDate:'2099-05-02',expectedScheduleRevision:2,expectedScheduleStatus:'scheduled'});
  const row=(await ref.get()).data();assert.equal(row.schedule.revision,3);assert.equal(row.schedule.window,'morning');assert.equal(row.schedule.customerConfirmation,null);
  await call('/requests/calendar-import','PATCH',{scheduledDate:'2099-05-03',expectedScheduleRevision:2,expectedScheduleStatus:'scheduled'},ownerToken,409);
 },true);
 await check('customer identities merge atomically, preserve consent/history and undo without losing financial updates',async()=>{
  const a=db.doc(`${root}/nestlocal_customers/identity-a`),b=db.doc(`${root}/nestlocal_customers/identity-b`),c=db.doc(`${root}/nestlocal_customers/identity-c`);
  await a.set({name:'Identity A',phone:'551155550001',lifetimeRevenueCents:1000,nextServiceDate:'2099-01-01',messaging:{consents:{maintenanceReminders:{accepted:true}}}});
  await b.set({name:'Identity B',phone:'551155550002',lifetimeRevenueCents:2000,nextServiceDate:'2099-02-01',messaging:{consents:{maintenanceReminders:{accepted:false}}}});
  await c.set({name:'Identity C',phone:'551155550003',lifetimeRevenueCents:3000});
  const batch=db.batch();for(let i=0;i<53;i++)batch.set(db.doc(`${root}/nestlocal_requests/identity-${String(i).padStart(3,'0')}`),{customerId:i%2?'identity-a':'identity-b',customer:{name:'Identity history'},status:'completed',trackingTokenHash:'secret',reviewTokenHashes:['secret']});await batch.commit();
  const input={sourceId:'identity-a',targetId:'identity-b',reason:'Same synthetic customer verified'};
  await call('/customers/merge/preview','POST',input,memberToken,403);
  const preview=await call('/customers/merge/preview','POST',input);
  assert.equal((await a.get()).data().mergedInto,undefined);
  const payload={...input,previewToken:preview.previewToken,operationKey:'nl-identity-synthetic-00001'};
  const results=await Promise.all([call('/customers/merge','POST',payload),call('/customers/merge','POST',payload)]);
  assert.equal(results.filter(x=>x.idempotent).length,1);assert.equal(results[0].mergeId,results[1].mergeId);
  assert.equal((await a.get()).data().lifetimeRevenueCents,1000);assert.equal((await b.get()).data().lifetimeRevenueCents,2000);
  assert.equal((await a.get()).data().messaging.consents.maintenanceReminders.accepted,true);
  const read=await call('/lists/customers/page?limit=100'),combined=read.items.find(x=>x.id==='identity-b');
  assert.equal(combined.lifetimeRevenueCents,3000);assert.equal(combined.identitySources.length,2);assert.equal(combined.messaging.consents.maintenanceReminders.accepted,false);
  assert.ok(!read.items.some(x=>x.id==='identity-a'));
  const first=await call('/customers/identity-a/history');assert.equal(first.items.length,50);assert.equal(first.hasMore,true);
  const last=await call('/customers/identity-b/history?cursor='+first.nextCursor);assert.equal(last.items.length,3);assert.equal(last.hasMore,false);
  assert.equal(new Set([...first.items,...last.items].map(x=>x.id)).size,53);
  for(const item of first.items){assert.equal(item.trackingTokenHash,undefined);assert.equal(item.reviewTokenHashes,undefined)}
  await call('/team/integration-field','PUT',{enabled:true,profile:'field'});
  await call('/customers/identity-b/history','GET',undefined,memberToken,403);
  await call('/team/integration-field','PUT',{enabled:true,profile:'legacy'});
  await b.update({lifetimeRevenueCents:2500,name:'Updated after merge'});
  const undo='/customers/merge/'+results[0].mergeId+'/undo';await call(undo,'POST',{reason:'Undo synthetic identity for test'});
  assert.equal((await call(undo,'POST',{reason:'Retry synthetic undo request'})).idempotent,true);
  assert.equal((await a.get()).data().mergedInto,undefined);assert.equal((await b.get()).data().lifetimeRevenueCents,2500);assert.equal((await b.get()).data().name,'Updated after merge');
  assert.equal((await db.collection(`${root}/nestlocal_requests`).where('customerId','==','identity-a').get()).size,26);
  await call('/customers/merge','POST',payload,ownerToken,409);
  const stale=await call('/customers/merge/preview','POST',input);await a.update({name:'Concurrent change'});
  await call('/customers/merge','POST',{...payload,previewToken:stale.previewToken,operationKey:'nl-identity-synthetic-stale'},ownerToken,409);
  const p=await call('/customers/merge/preview','POST',input),m=await call('/customers/merge','POST',{...payload,previewToken:p.previewToken,operationKey:'nl-identity-synthetic-second'});
  const input2={sourceId:'identity-c',targetId:'identity-b',reason:'Third record same synthetic person'},p2=await call('/customers/merge/preview','POST',input2);
  const m2=await call('/customers/merge','POST',{...input2,previewToken:p2.previewToken,operationKey:'nl-identity-synthetic-third'});
  await call('/customers/merge/'+m.mergeId+'/undo','POST',{reason:'Cannot undo superseded merge'},ownerToken,409);
  await call('/customers/merge/'+m2.mergeId+'/undo','POST',{reason:'Reverse latest synthetic merge'});
  await call('/customers/merge/'+m.mergeId+'/undo','POST',{reason:'Reverse original synthetic merge'});
 },true);
 if(process.env.NESTLOCAL_BROWSER_INTEGRATION==='true'&&!coreOnly){
  await check('browser saves settings through the real API into Firestore',async()=>{
   mkdirSync('artifacts/profiles',{recursive:true});
   const {chromium}=await import('playwright');
   const web=express();
   web.use('/api',express.raw({type:()=>true,limit:'128kb'}),async(req,res)=>{
    try{
     const upstream=await fetch(`http://127.0.0.1:${apiPort}${req.originalUrl}`,{
      method:req.method,headers:{...(req.headers.authorization?{authorization:req.headers.authorization}:{}),'content-type':'application/json'},
      ...(['GET','HEAD'].includes(req.method)?{}:{body:req.body?.length?req.body:undefined})});
     res.status(upstream.status).type('application/json').send(await upstream.text());
    }catch{res.status(502).json({error:'SYNTHETIC_PROXY_UNAVAILABLE'})}
   });
   web.use(express.static(new URL('../web',import.meta.url).pathname));
   const webServer=web.listen(18187,'127.0.0.1');await once(webServer,'listening');
   let browser;
   try{
    browser=await chromium.launch({headless:true});
    for(const width of [320,390,1440]){
     const ids=['aaa-merge-a-'+width,'aaa-merge-b-'+width];
     for(const [i,id] of ids.entries())await db.doc(`${root}/nestlocal_customers/${id}`).set({name:'Merge browser '+i+' '+width,phone:'55114444000'+i,lifetimeRevenueCents:100*(i+1)});
     const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
     await page.addInitScript(({token,org})=>{sessionStorage.setItem('nl_session_token',token);localStorage.setItem('nl_org',org)},{token:ownerToken,org:orgId});
     await page.goto('http://127.0.0.1:18187/',{waitUntil:'domcontentloaded'});
     await page.locator('[data-nav="customers"]:visible').first().click();
     await page.locator('.customer-merge summary').click();const form=page.locator('#customer-merge');
     await form.locator('[name=sourceId]').selectOption(ids[0]);await form.locator('[name=targetId]').selectOption(ids[1]);await form.locator('[name=reason]').fill('Same synthetic customer verified in browser');
     const preview=page.waitForResponse(r=>r.url().endsWith('/customers/merge/preview'));await form.locator('[type=submit]').click();assert.equal((await preview).status(),200);
     await form.locator('[name=confirmIdentity]').check();await page.screenshot({path:`artifacts/profiles/customer-merge-${width}.png`});
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Merge overflow '+width);
     const merged=page.waitForResponse(r=>r.url().endsWith('/customers/merge'));await form.locator('[type=submit]').click();const result=await merged;assert.equal(result.status(),200);const body=await result.json();
     const undo=page.locator(`[data-merge-undo="${body.mergeId}"]`);await undo.waitFor({state:'attached'});await undo.locator('xpath=..').locator('summary').click();
     await undo.locator('[name=reason]').fill('Undo synthetic browser test');const undone=page.waitForResponse(r=>r.url().endsWith('/undo'));await undo.locator('[type=submit]').click();assert.equal((await undone).status(),200);
     assert.equal((await db.doc(`${root}/nestlocal_customers/${ids[0]}`).get()).data().mergedInto,undefined);assert.deepEqual(errors,[]);await page.close();
    }
    for(const width of [390,1440]){
     const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
     page.on('pageerror',error=>errors.push(error.message));
     await page.addInitScript(({token,org})=>{sessionStorage.setItem('nl_session_token',token);localStorage.setItem('nl_org',org)},{token:ownerToken,org:orgId});
     await page.goto('http://127.0.0.1:18187/',{waitUntil:'domcontentloaded'});
     await page.locator('.shell').waitFor({timeout:15000});
     await page.evaluate(()=>document.querySelector('.sidebar [data-nav="services"]').click());
     const business=`Browser verified ${width}`;
     await page.locator('#settings [name="business"]').fill(business);
     const response=page.waitForResponse(r=>r.url().endsWith('/nestlocal/settings')&&r.request().method()==='PUT');
     await page.locator('#settings button[type="submit"]').click();
     assert.equal((await response).status(),200);
     // Proves DOM -> HTTP handler -> canonical authorized transaction -> database,
     // rather than accepting the toast or a mocked response as proof of saving.
     const stored=(await db.doc(`${root}/nestlocal_settings/public`).get()).data();
     assert.equal(stored.draftSettings.businessName,business);
     assert.equal(stored.published,true);assert.equal(stored.messaging.connected,true);
     await page.locator('#settings [name="business"]').waitFor();
     const capacity=page.locator('#capacity-settings');
     const saved=page.waitForResponse(r=>r.url().endsWith('/nestlocal/capacity')&&r.request().method()==='PUT');
     await capacity.locator('[name="timezone"]').fill('UTC');
     await capacity.locator('button[type="submit"]').click();
     assert.equal((await saved).status(),200);
     assert.equal((await db.doc(`${root}/nestlocal_settings/public`).get()).data().timezone,'UTC');
     assert.deepEqual(errors,[]);await page.close();
    }
    for(const width of [320,390,1440]){
     const customerId='aaa-site-browser-'+width,customerRef=db.doc(`${root}/nestlocal_customers/${customerId}`);
     await customerRef.set({name:'Browser site import '+width,phone:'5511777777777',siteCount:0,createdAt:admin.firestore.Timestamp.now()});
     const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
     page.on('pageerror',error=>errors.push(error.message));
     await page.addInitScript(({token,org})=>{sessionStorage.setItem('nl_session_token',token);localStorage.setItem('nl_org',org)},{token:ownerToken,org:orgId});
     await page.goto('http://127.0.0.1:18187/',{waitUntil:'domcontentloaded'});
     await page.locator('[data-nav="customers"]:visible').first().click();
     await page.locator(`[data-load-customer-sites="${customerId}"]`).click();
     const form=page.locator(`[data-site-batch="${customerId}"]`);await form.locator('xpath=..').locator('summary').click();
     const csv='Local;Endereço;Cidade;Equipamento;Observações\nMatriz;Rua Exemplo 123;Londrina;Split sala;Recepção\nMatriz;Rua Exemplo 123;Londrina;Split cozinha;Recepção\nFilial;Rua Filial 456;Cambé;;';
     await form.locator('[data-site-file]').setInputFiles({name:'locais.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
     await page.waitForFunction(id=>document.querySelector(`[data-site-batch="${id}"] textarea`).value.includes('Split cozinha'),customerId);
     const reviewed=page.waitForResponse(r=>r.url().endsWith('/sites/import/preview')&&r.request().method()==='POST');
     await form.locator('[type=submit]').click();assert.equal((await reviewed).status(),200);
     await form.locator('[data-site-preview] li').first().waitFor();
     assert.equal((await customerRef.collection('sites').get()).size,0,'Preview must not write');
     assert.equal(await form.locator('[data-site-preview] li').count(),2);
     const actionVisible=await form.locator('[type=submit]').evaluate(button=>{
      const box=button.getBoundingClientRect(),nav=document.querySelector('.bottom-nav'),boundary=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight;
      return box.top>=0&&box.bottom<=Math.min(boundary,innerHeight)-8;
     });
     assert.ok(actionVisible,'Confirmation must stay above mobile navigation '+width);
     await page.screenshot({path:`artifacts/profiles/site-import-${width}.png`});
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Site import overflow '+width);
     // Editing invalidates the previous preview before any import can occur.
     await form.locator('textarea').fill(csv+'\n');assert.equal(await form.locator('[data-site-preview] li').count(),0);
     const again=page.waitForResponse(r=>r.url().endsWith('/sites/import/preview'));await form.locator('[type=submit]').click();assert.equal((await again).status(),200);
     const imported=page.waitForResponse(r=>r.url().endsWith('/sites/import')&&r.request().method()==='POST');
     await form.locator('[type=submit]').click();assert.equal((await imported).status(),201);
     const sites=await customerRef.collection('sites').get();assert.equal(sites.size,2);
     assert.equal(sites.docs.find(x=>x.data().label==='Matriz').data().equipment.length,2);
     assert.equal((await customerRef.get()).data().siteCount,2);assert.deepEqual(errors,[]);await page.close();
    }
    for(const width of [320,390,1440]){
     const id=`aaa-browser-${width}`,ref=db.doc(`${root}/nestlocal_requests/${id}`);
     await ref.set({status:'scheduled',serviceId:'clean',quantity:1,customer:{name:'Browser assigned customer',phone:'5511999999999'},address:{line:'Assigned road',city:'Test'},schedule:{assignedTo:'integration-field',date:width===320?'2099-01-03':width===390?'2099-01-04':'2099-01-05',window:'afternoon'},quote:{totalCents:123456},commercial:{amountPaidCents:0,paymentStatus:'pending'},execution:{checklist:[{id:'inspect',label:'Inspect site',done:false}]}});
     await call('/team/integration-field','PUT',{enabled:true,profile:'field'});
     const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
     page.on('pageerror',error=>errors.push(error.message));
     await page.addInitScript(({token,org})=>{sessionStorage.setItem('nl_session_token',token);localStorage.setItem('nl_org',org)},{token:memberToken,org:orgId});
     await page.goto('http://127.0.0.1:18187/',{waitUntil:'domcontentloaded'});
     const form=page.locator(`[data-field-job="${id}"]`);await form.waitFor({timeout:15000});
     assert.equal(await page.locator('[data-nav="customers"]').count(),0);
     assert.equal(await page.locator('[data-nav="services"]').count(),0);
     assert.equal(await page.locator('[name="finalAmount"]').count(),0);
     await form.locator('[name="executionNotes"]').fill(`Field verified ${width}`);
     await form.locator('label:has(input[type="checkbox"])').click();
     await page.screenshot({path:`artifacts/profiles/field-${width}.png`});
     const layout=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,width:innerWidth,overflow:Array.from(document.querySelectorAll('.main *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,6).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right}))}));
     assert.ok(layout.actual<=layout.width+1,`field overflow ${width}px: ${JSON.stringify(layout)}`);
     const response=page.waitForResponse(r=>r.url().endsWith('/requests/'+id)&&r.request().method()==='PATCH');
     await form.locator('button[type="submit"]').click();const savedResponse=await response;
     assert.equal(savedResponse.status(),200,`field ${width}px: ${await savedResponse.text()}`);
     const saved=(await ref.get()).data();assert.equal(saved.status,'in_progress');assert.equal(saved.execution.notes,`Field verified ${width}`);assert.equal(saved.execution.checklist[0].done,true);assert.equal(saved.quote.totalCents,123456);
     assert.deepEqual(errors,[]);await page.close();
    }
    await call('/team/integration-field','PUT',{enabled:true,profile:'finance'});
    const finance=await browser.newPage({viewport:{width:390,height:900}});
    await finance.addInitScript(({token,org})=>{sessionStorage.setItem('nl_session_token',token);localStorage.setItem('nl_org',org)},{token:memberToken,org:orgId});
    // A createdAt field makes this job part of the ordinary recent-request page.
    await db.doc(`${root}/nestlocal_requests/aaa-browser-390`).update({createdAt:admin.firestore.Timestamp.now()});
    await finance.goto('http://127.0.0.1:18187/',{waitUntil:'domcontentloaded'});
    const receiptForm=finance.locator('[data-finance-job="aaa-browser-390"]');await receiptForm.waitFor({timeout:15000});
    await finance.screenshot({path:'artifacts/profiles/finance-390.png'});
    await receiptForm.locator('[name="amountPaid"]').fill('1.00');await receiptForm.locator('[name="paymentStatus"]').selectOption('partial');
    const paid=finance.waitForResponse(r=>r.url().endsWith('/requests/aaa-browser-390')&&r.request().method()==='PATCH');
    await receiptForm.locator('button[type="submit"]').click();assert.equal((await paid).status(),200);
    assert.equal((await db.doc(`${root}/nestlocal_requests/aaa-browser-390`).get()).data().commercial.amountPaidCents,100);
    await call('/team/integration-field','PUT',{enabled:true,profile:'viewer'});await finance.reload();
    await finance.locator('.shell').waitFor({timeout:15000});assert.ok(await finance.getByText('Seu perfil permite apenas consultar os dados.').count());
    await finance.close();
   }finally{if(browser)await browser.close();await new Promise(resolve=>webServer.close(resolve))}
  });
 }
 console.log(`NESTLOCAL_EMULATOR_${coreOnly?'CORE':'FULL'}_INTEGRATION_PASSED (synthetic data; no cloud certification)`);
}catch(error){console.error(error);process.exitCode=1}
finally{
 if(server&&server.exitCode===null){const done=once(server,'exit');server.kill('SIGTERM');await done}
 await app.delete();
}
