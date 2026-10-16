#!/usr/bin/env node
// Cloud Run Job / trusted operator only. No unauthenticated HTTP scheduler.
// Safe defaults: dry run, explicit organizations, small bounds, no PII logs.
import admin from 'firebase-admin';
import crypto from 'node:crypto';
import {dueActorsForPush} from '../src/domain/push-reminders.mjs';

const arg=name=>{const n=process.argv.indexOf(name);return n<0?'':process.argv[n+1]||''};
const projectId=process.env.FIREBASE_PROJECT_ID||'',send=process.argv.includes('--send'),
  ids=arg('--orgs').split(',').map(x=>x.trim()).filter(Boolean).sort();
if(!/^[a-z0-9][a-z0-9-]{3,127}$/i.test(projectId))throw Error('FIREBASE_PROJECT_ID_REQUIRED');
if(!ids.length||ids.length>20||ids.some(x=>!/^[A-Za-z0-9_-]{1,128}$/.test(x))||
   new Set(ids).size!==ids.length)throw Error('EXPLICIT_ORG_SCOPE_REQUIRED');
if(send&&(process.env.NESTLOCAL_PUSH_ENABLED!=='true'||
  process.env.NESTLOCAL_PUSH_SCHEDULER_ENABLED!=='true'))
  throw Error('PUSH_SCHEDULER_NOT_APPROVED');
admin.initializeApp({projectId,credential:admin.credential.applicationDefault()});
const db=admin.firestore(),now=new Date(),maximum=new Date(now.getTime()+36*3600000).toISOString().slice(0,10);
const totals={organizations:0,dueActors:0,attempted:0,providerAccepted:0,reviewRequired:0};
const safeToken=value=>typeof value==='string'&&value.length>=50&&value.length<=4096&&
  /^[A-Za-z0-9_:\-\.]+$/.test(value);
for(const orgId of ids){
  const root=`organizations/${orgId}`,org=await db.doc(root).get();
  if(!org.exists||['inactive','suspended','disabled'].includes(org.data()?.status))
    throw Error('ORGANIZATION_NOT_ACTIVE');
  const tasks=[],collection=db.collection(`${root}/nestlocal_action_tasks`);
  let last=null;
  for(let page=0;page<10;page++){
    let query=collection.orderBy('dueDate').endAt(maximum).limit(200);
    if(last)query=query.startAfter(last);
    const snap=await query.get();
    tasks.push(...snap.docs.map(doc=>doc.data()));
    if(snap.size<200){last=null;break}
    last=snap.docs.at(-1);
  }
  if(last)throw Error('PUSH_TASK_SCAN_LIMIT_REACHED');
  const actors=dueActorsForPush(tasks,now);
  if(actors.length>30)throw Error('PUSH_ACTOR_LIMIT_REACHED');
  totals.organizations++;totals.dueActors+=actors.length;
  for(const actor of actors){
    const uid=actor.uid,member=await db.doc(`${root}/members/${uid}`).get();
    const role=String(member.data()?.role||member.data()?.organizationRole||'').toLowerCase();
    if(!member.exists||['inactive','disabled','removed','revoked'].includes(member.data()?.status)||
      !(role==='owner'||member.data()?.appAccess?.nestlocal?.enabled===true))continue;
    const snap=await db.collection(`${root}/nestlocal_push_devices`)
      .where('uid','==',uid).limit(9).get();
    if(snap.size>8)throw Error('PUSH_DEVICE_LIMIT_REACHED');
    const devices=snap.docs.map(doc=>doc.data()).filter(d=>d.enabled===true&&d.revoked!==true&&safeToken(d.token));
    if(!devices.length)continue;
    if(!send)continue;
    const id=crypto.createHash('sha256').update(uid+'|'+actor.date).digest('hex'),
      ref=db.doc(`${root}/nestlocal_push_dispatch/${id}`);
    const reserved=await db.runTransaction(async tx=>{
      const previous=await tx.get(ref);
      if(previous.exists)return false;
      tx.create(ref,{uid,date:actor.date,state:'reserved',channel:'fcm',attempts:1,
        createdAt:admin.firestore.FieldValue.serverTimestamp(),
        expiresAt:admin.firestore.Timestamp.fromMillis(now.getTime()+40*86400000)});
      return true;
    });
    if(!reserved)continue;
    totals.attempted++;
    try{
      const batch=await admin.messaging().sendEach(devices.map(d=>({
        token:d.token,
        data:{kind:'task_due',locale:['pt','en','es'].includes(d.locale)?d.locale:'pt',
          destination:'/?view=today'},
        webpush:{headers:{TTL:'900',Urgency:'normal'}}
      })));
      totals.providerAccepted+=batch.successCount;
      if(batch.failureCount)totals.reviewRequired++;
      await ref.update({state:batch.failureCount?'needs_review':'provider_accepted',
        acceptedCount:batch.successCount,rejectedCount:batch.failureCount,
        processedAt:admin.firestore.FieldValue.serverTimestamp()});
    }catch(error){
      totals.reviewRequired++;
      await ref.update({state:'needs_review',errorCode:String(error?.code||'UNKNOWN').slice(0,80),
        processedAt:admin.firestore.FieldValue.serverTimestamp()});
      // Never retry ambiguous delivery automatically.
    }
  }
}
console.log('NESTLOCAL_PUSH_JOB',JSON.stringify({...totals,mode:send?'send':'dry_run',
  deviceDeliveryConfirmed:false}));
