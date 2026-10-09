#!/usr/bin/env node
// READ-ONLY production preflight. Requires trusted Firebase ADC, explicit org scope and audit salt.
// Never prints customer data, Stripe IDs, roles or music scale contents.
import admin from 'firebase-admin';
import {readFileSync,writeFileSync} from 'node:fs';
import {
 fingerprint,protectedHubProjection,protectedOrganizationProjection,protectedMembershipProjection,
 signatureForCollection,compareReleaseSnapshots,
} from '../src/domain/release-safety.mjs';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:''}
const capture=arg('--capture'),compare=arg('--compare'),orgArg=arg('--orgs');
const projectId=process.env.FIREBASE_PROJECT_ID||'',salt=process.env.NESTLOCAL_AUDIT_SALT||'';
if(Boolean(capture)===Boolean(compare))throw Error('USE_EITHER_CAPTURE_OR_COMPARE');
if(!projectId||!/^[-a-z0-9]{4,128}$/i.test(projectId))throw Error('FIREBASE_PROJECT_ID_REQUIRED');
if(salt.length<16)throw Error('NESTLOCAL_AUDIT_SALT_REQUIRED');
if(!compare&&!orgArg)throw Error('EXPLICIT_ORG_SCOPE_REQUIRED');
admin.initializeApp({projectId,credential:admin.credential.applicationDefault()});
const db=admin.firestore();
let before=null;
if(compare){
 before=JSON.parse(readFileSync(compare,'utf8'));
 if(before.projectId!==projectId)throw Error('PROJECT_MISMATCH');
}
const ids=(orgArg?orgArg.split(','):Object.keys(before?.organizations||{})).map(x=>x.trim()).filter(Boolean);
if(!ids.length||ids.length>200||ids.some(id=>!/^[A-Za-z0-9_-]{1,128}$/.test(id))||
 new Set(ids).size!==ids.length)throw Error('INVALID_ORG_SCOPE');
const organizations={};
for(const id of ids.sort()){
 const [sub,org,members,legacyMembers,scales,bandScales,fixedBandScales]=await Promise.all([
  db.doc('subscriptions/'+id).get(),db.doc('organizations/'+id).get(),
  db.collection('organizations/'+id+'/members').get(),
  db.collection('organization_members').where('organizationId','==',id).get(),
  db.collection('scales').where('organizationId','==',id).get(),
  db.collection('bandScales').where('organizationId','==',id).get(),
  db.collection('fixedBandScales').where('organizationId','==',id).get(),
 ]);
 if(!org.exists)throw Error('ORGANIZATION_NOT_FOUND');
 organizations[id]={
  subscription:fingerprint(protectedHubProjection(sub.data()||{}),salt),
  organization:fingerprint(protectedOrganizationProjection(org.data()||{}),salt),
  members:signatureForCollection(members.docs,salt,protectedMembershipProjection),
  legacyMembers:signatureForCollection(legacyMembers.docs,salt,protectedMembershipProjection),
  scales:signatureForCollection(scales.docs,salt),
  bandScales:signatureForCollection(bandScales.docs,salt),
  fixedBandScales:signatureForCollection(fixedBandScales.docs,salt),
 };
}
const snapshot={schemaVersion:1,projectId,capturedAt:new Date().toISOString(),organizations};
if(capture){
 writeFileSync(capture,JSON.stringify(snapshot,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log('RELEASE_SNAPSHOT_CREATED',capture,'organizations',ids.length,
  'No private records were written to the report. Protect both the report and the external salt.');
}else{
 const result=compareReleaseSnapshots(before,snapshot);
 if(!result.passed){
  console.error('RELEASE_GUARD_FAILED',JSON.stringify(result.changes));
  process.exitCode=2;
 }else{
  console.log('RELEASE_GUARD_PASS: selected protected MusicScale projections unchanged for',ids.length,'organizations.');
 }
}
// Never write to Firestore and never upload this report as a CI artifact.
