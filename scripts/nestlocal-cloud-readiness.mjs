// Authorized read-only inspection. No raw customer records or identifiers leave
// Firestore; logs contain only aggregate readiness and invariant failure counts.
import admin from 'firebase-admin';
import {inspectRequestFinance} from '../src/domain/financial-reconciliation.mjs';
const projectId=process.env.FIREBASE_PROJECT_ID;
if(projectId!=='millionsnest'||process.env.FIRESTORE_EMULATOR_HOST)throw Error('EXPLICIT_CLOUD_PROJECT_REQUIRED');
const app=admin.initializeApp({projectId}),db=admin.firestore();
const report={schemaVersion:1,readOnly:true,organizationsScanned:0,nestlocalOrganizations:0,requestsScanned:0,customersScanned:0,issues:{},truncated:false};
const issue=key=>report.issues[key]=(report.issues[key]||0)+1;
try{
 const [allRequests,allSettings,allCustomers]=await Promise.all([
  db.collectionGroup('nestlocal_requests').count().get(),
  db.collectionGroup('nestlocal_settings').count().get(),
  db.collectionGroup('nestlocal_customers').count().get()
 ]);
 report.totalRequestRecords=allRequests.data().count;
 report.totalSettingsRecords=allSettings.data().count;
 report.totalCustomerRecords=allCustomers.data().count;
 const orgs=await db.collection('organizations').orderBy(admin.firestore.FieldPath.documentId()).limit(201).get();
 report.truncated=orgs.size>200;
 for(const org of orgs.docs.slice(0,200)){
  report.organizationsScanned++;
  const root=org.ref.path,settings=await db.doc(`${root}/nestlocal_settings/public`).get();
  if(!settings.exists)continue;
  report.nestlocalOrganizations++;
  const requests=db.collection(`${root}/nestlocal_requests`);
  const total=(await requests.count().get()).data().count;
  if(total>5000)report.truncated=true;
  let cursor=null,scanned=0;
  while(scanned<Math.min(total,5000)){
   let query=requests.orderBy(admin.firestore.FieldPath.documentId()).limit(Math.min(100,5000-scanned));
   if(cursor)query=query.startAfter(cursor);
   const page=await query.get();if(!page.size)break;
   for(const doc of page.docs){
    const record=doc.data();
    const assisted=record.attribution?.assisted===true&&record.status==='completed'?
      await db.doc(`${root}/nestlocal_revenue_events/${doc.id}`).get():null;
    for(const key of inspectRequestFinance(record,assisted?.exists?assisted.data():null).issues)issue(key);
    report.requestsScanned++;
   }
   scanned+=page.size;cursor=page.docs.at(-1);
  }
  if(scanned!==total)report.truncated=true;
  report.customersScanned+=(await db.collection(`${root}/nestlocal_customers`).count().get()).data().count;
  // Exercise the production query shapes; missing indexes fail the workflow.
  await requests.orderBy('createdAt','desc').limit(1).get();
  await requests.where('status','==','quoted').orderBy(admin.firestore.FieldPath.documentId()).limit(1).get();
  await db.collection(`${root}/nestlocal_customers`).where('nextServiceDate','<=',new Date().toISOString().slice(0,10)).orderBy('nextServiceDate').limit(1).get();
  await db.collection(`${root}/nestlocal_schedule_slots`).orderBy('date').orderBy(admin.firestore.FieldPath.documentId()).limit(1).get();
 }
 if(report.requestsScanned!==report.totalRequestRecords){issue('REQUESTS_OUTSIDE_SCANNED_SCOPE');report.truncated=true}
 if(report.customersScanned!==report.totalCustomerRecords){issue('CUSTOMERS_OUTSIDE_SCANNED_SCOPE');report.truncated=true}
 if(report.nestlocalOrganizations===0&&report.totalSettingsRecords>0){issue('SETTINGS_OUTSIDE_SCANNED_SCOPE');report.truncated=true}
 // Validate indexes even before the first company is configured. These queries
 // never create the probe parent or any document beneath it.
 const probe='organizations/__nestlocal_readiness_probe__';
 await db.collection(`${probe}/nestlocal_requests`).where('status','==','quoted').orderBy(admin.firestore.FieldPath.documentId()).limit(1).get();
 await db.collection(`${probe}/nestlocal_customers`).where('nextServiceDate','<=','2099-01-01').orderBy('nextServiceDate').limit(1).get();
 await db.collection(`${probe}/nestlocal_schedule_slots`).orderBy('date').orderBy(admin.firestore.FieldPath.documentId()).limit(1).get();
 console.log(JSON.stringify(report,null,2));
 if(report.truncated||Object.keys(report.issues).length)process.exitCode=2;
}catch(error){console.error('NESTLOCAL_CLOUD_AUDIT_FAILED',error?.code||error?.name||'ERROR');process.exitCode=1}
finally{await app.delete()}
