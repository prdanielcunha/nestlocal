// Runs the actual API and Admin SDK against an isolated Firestore emulator.
// No production credentials, Google login bypass or external delivery is used.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {once} from 'node:events';
import admin from 'firebase-admin';

const projectId='demo-nestlocal-integration',coreOnly=process.argv.includes('--core-only');
assert.equal(process.env.FIREBASE_PROJECT_ID,projectId,'Only the synthetic demo project is allowed');
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/,'A loopback emulator is mandatory');
assert.ok(!process.env.GOOGLE_APPLICATION_CREDENTIALS,'Do not supply cloud credentials');
const app=admin.initializeApp({projectId}),db=admin.firestore();
const orgId='integration-a',root=`organizations/${orgId}`,apiPort=18186;
const token=randomBytes(32).toString('base64url'),ownerToken=`nl_${token}`;
const memberToken=`nl_${randomBytes(32).toString('base64url')}`;
const hash=value=>createHash('sha256').update(value).digest('hex');
let server,logs='';
async function call(path,method='GET',body,auth=ownerToken,expected=200){
 const response=await fetch(`http://127.0.0.1:${apiPort}/api/organizations/${orgId}/nestlocal${path}`,{
  method,headers:{authorization:`Bearer ${auth}`,'content-type':'application/json'},
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
  GCLOUD_PROJECT:projectId,NESTLOCAL_PUSH_ENABLED:'false',NESTLOCAL_HUB_ENTITLEMENT_V3_ENABLED:'false'
 },stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',b=>{logs+=b});server.stderr.on('data',b=>{logs+=b});
 for(let i=0;i<100;i++){
  try{await fetch(`http://127.0.0.1:${apiPort}/health`);break}catch{}
  if(server.exitCode!==null)throw Error(`API failed: ${logs}`);
  await new Promise(r=>setTimeout(r,100));
 }
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
 console.log(`NESTLOCAL_EMULATOR_${coreOnly?'CORE':'FULL'}_INTEGRATION_PASSED (synthetic data; no cloud certification)`);
}catch(error){console.error(error);process.exitCode=1}
finally{
 if(server&&server.exitCode===null){const done=once(server,'exit');server.kill('SIGTERM');await done}
 await app.delete();
}
