#!/usr/bin/env node
// READ-ONLY, scoped financial preflight; no mutations, secrets, contacts or names
// leave the process. Complete scans must be confirmed explicitly; default is bounded.
import admin from 'firebase-admin';
import {inspectRequestFinance,summarizeRequestFinance} from '../src/domain/financial-reconciliation.mjs';

const arg=name=>{const i=process.argv.indexOf(name);return i<0?'':process.argv[i+1]||''};
const projectId=process.env.FIREBASE_PROJECT_ID||'',orgId=arg('--org'),maximum=Number(arg('--max-requests')||500);
if(!/^[a-z0-9][a-z0-9-]{3,127}$/i.test(projectId))throw Error('PROJECT_REQUIRED');
if(!/^[A-Za-z0-9_-]{1,128}$/.test(orgId))throw Error('EXPLICIT_ORG_SCOPE_REQUIRED');
if(!Number.isSafeInteger(maximum)||maximum<1||maximum>10000)throw Error('INVALID_SCAN_LIMIT');
admin.initializeApp({projectId,credential:admin.credential.applicationDefault()});
const db=admin.firestore(),root=`organizations/${orgId}`,
 collection=db.collection(`${root}/nestlocal_requests`);
const [org,total]=await Promise.all([db.doc(root).get(),collection.count().get()]);
if(!org.exists)throw Error('ORGANIZATION_NOT_FOUND');
let cursor=null,scanned=0;
const records=[];
while(scanned<maximum){
 let query=collection.orderBy(admin.firestore.FieldPath.documentId()).limit(Math.min(100,maximum-scanned));
 if(cursor)query=query.startAfter(cursor);
 const page=await query.get();
 if(!page.size)break;
 const needsEvent=page.docs.filter(doc=>doc.data()?.attribution?.assisted===true&&doc.data()?.status==='completed');
 const eventDocs=needsEvent.length?await db.getAll(...needsEvent.map(doc=>db.doc(`${root}/nestlocal_revenue_events/${doc.id}`))):[];
 const byId=new Map(needsEvent.map((doc,index)=>[doc.id,eventDocs[index]?.exists?eventDocs[index].data():null]));
 for(const doc of page.docs){
  const data=doc.data()||{};
  const event=byId.has(doc.id)?byId.get(doc.id):null;
  records.push({assessment:inspectRequestFinance(data,event)});
 }
 cursor=page.docs.at(-1);
 scanned+=page.size;
 if(page.size<Math.min(100,maximum-(scanned-page.size)))break;
}
const summary=summarizeRequestFinance(records,total.data().count);
// No organization ID, record ID, names, phone, auth, monetary detail per customer.
console.log(JSON.stringify({schemaVersion:1,report:'NESTLOCAL_READ_ONLY_FINANCE_PREFLIGHT',
 scanComplete:summary.complete,scanned:summary.scanned,total:summary.totalCount,
 completed:summary.completed,recordedExecutedCents:summary.recordedExecutedCents,
 recordedManualPaidCents:summary.recordedManualPaidCents,issues:summary.issues},null,2));
if(!summary.complete)process.exitCode=3; // force review of truncated results
else if(Object.values(summary.issues).some(count=>count>0))process.exitCode=2;
// No automatic financial fixes, payment capture, refund, communication or database write.
