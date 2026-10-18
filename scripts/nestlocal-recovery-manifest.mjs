#!/usr/bin/env node
// Explicit, read-only verification: count key NestLocal collections and HMAC
// their configuration. It neither exports nor imports private Firebase data.
import admin from 'firebase-admin';
import {getFirestore} from 'firebase-admin/firestore';
import {readFileSync,writeFileSync} from 'node:fs';
import {fingerprint,signatureForCollection} from '../src/domain/release-safety.mjs';
import {compareNestLocalRecoveryManifest,validRecoveryDatabaseId} from '../src/domain/recovery-manifest.mjs';

function arg(name){const i=process.argv.indexOf(name);return i<0?'':process.argv[i+1]||''}
const capture=arg('--capture'),verify=arg('--verify'),input=arg('--orgs'),
  projectId=process.env.FIREBASE_PROJECT_ID||'',databaseId=process.env.FIRESTORE_DATABASE_ID||'(default)',salt=process.env.NESTLOCAL_AUDIT_SALT||'';
if(Boolean(capture)===Boolean(verify))throw new Error('CHOOSE_CAPTURE_OR_VERIFY');
if(!/^[a-z0-9][a-z0-9-]{3,127}$/i.test(projectId))throw new Error('PROJECT_REQUIRED');
if(!validRecoveryDatabaseId(databaseId))throw new Error('INVALID_RECOVERY_DATABASE');
if(salt.length<16)throw new Error('AUDIT_SALT_REQUIRED');
if(!capture&&!verify||!input)throw new Error('EXPLICIT_ORG_SCOPE_REQUIRED');
const ids=input.split(',').map(id=>id.trim()).filter(Boolean).sort();
if(!ids.length||ids.length>50||new Set(ids).size!==ids.length||
   ids.some(id=>!/^[A-Za-z0-9_-]{1,128}$/.test(id)))throw new Error('INVALID_ORG_SCOPE');
const before=verify?JSON.parse(readFileSync(verify,'utf8')):null;
if(before){
  if(before.projectId===projectId&&(before.schemaVersion===1||(before.databaseId||'(default)')===databaseId))throw new Error('RECOVERY_DESTINATION_MUST_BE_ISOLATED');
  const oldIds=Object.keys(before.organizations||{}).sort();
  if(JSON.stringify(ids)!==JSON.stringify(oldIds))throw new Error('RECOVERY_SCOPE_MISMATCH');
}
const app=admin.initializeApp({projectId,credential:admin.credential.applicationDefault()});
const db=getFirestore(app,databaseId),organizations={};
for(const id of ids){
  const root=`organizations/${id}`;
  const [org,settings,services,requests,customers,slots,adjustments]=await Promise.all([
    db.doc(root).get(),db.doc(`${root}/nestlocal_settings/public`).get(),
    db.collection(`${root}/nestlocal_services`).get(),
    db.collection(`${root}/nestlocal_requests`).count().get(),
    db.collection(`${root}/nestlocal_customers`).count().get(),
    db.collection(`${root}/nestlocal_schedule_slots`).count().get(),
    db.collection(`${root}/nestlocal_financial_adjustments`).count().get(),
  ]);
  if(!org.exists)throw new Error('ORGANIZATION_NOT_FOUND');
  organizations[id]={
    settings:settings.exists?fingerprint(settings.data(),salt):null,
    services:signatureForCollection(services.docs,salt),
    requests:requests.data().count,customers:customers.data().count,
    scheduleSlots:slots.data().count,financialAdjustments:adjustments.data().count,
  };
}
const manifest={schemaVersion:before?.schemaVersion||2,projectId,...(before?.schemaVersion===1?{}:{databaseId}),capturedAt:new Date().toISOString(),organizations};
if(capture){
  writeFileSync(capture,JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log('NESTLOCAL_MANIFEST_CAPTURED',ids.length,'organizations; no raw customer data');
}else{
  const result=compareNestLocalRecoveryManifest(before,manifest);
  if(!result.passed){
    console.error('NESTLOCAL_RECOVERY_VERIFICATION_FAILED',JSON.stringify(result.findings));
    process.exitCode=2;
  }else console.log('NESTLOCAL_RECOVERY_VERIFIED',ids.length,'organizations; source and isolated target agree');
}
// A manifest cannot restore data. Actual cloud backup/export and isolated restore
// must be run and audited by an authorized operator, per the recovery runbook.
