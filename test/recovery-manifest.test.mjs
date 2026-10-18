import test from 'node:test';
import assert from 'node:assert/strict';
import {compareNestLocalRecoveryManifest,validateNestLocalRecoveryManifest} from '../src/domain/recovery-manifest.mjs';

const base={schemaVersion:1,projectId:'nestlocal-production',organizations:{
 org1:{settings:'a'.repeat(64),services:{count:2,digest:'b'.repeat(64)},requests:251,
       customers:149,scheduleSlots:34,financialAdjustments:4}
}};
const restore=JSON.parse(JSON.stringify(base));
restore.projectId='nestlocal-isolated-drill';

test('C20: isolated restore with matching counts and signed configuration passes',()=>{
 assert.deepEqual(compareNestLocalRecoveryManifest(base,restore),{passed:true,findings:[]});
});
test('C20: a production-target restore is never accepted',()=>{
 assert.throws(()=>compareNestLocalRecoveryManifest(base,base),{message:'RECOVERY_DESTINATION_MUST_BE_ISOLATED'});
});
test('C20: a missing financial or operational record is flagged without PII',()=>{
 const missing=JSON.parse(JSON.stringify(restore));
 missing.organizations.org1.requests--;
 missing.organizations.org1.financialAdjustments--;
 const result=compareNestLocalRecoveryManifest(base,missing);
 assert.equal(result.passed,false);
 assert.deepEqual(result.findings.map(item=>item.section),['requests','financialAdjustments']);
 assert.ok(!JSON.stringify(result.findings).includes('phone'));
});
test('C20: explicit, matching source organization scope is required',()=>{
 const extra=JSON.parse(JSON.stringify(restore));
 extra.organizations.org2={...base.organizations.org1};
 assert.throws(()=>compareNestLocalRecoveryManifest(base,extra),{message:'RECOVERY_SCOPE_MISMATCH'});
});
test('C20: empty or malformed manifests never pass as a verified restore',()=>{
 for(const organizations of [{},[],null,{org1:{}},{'bad/path':base.organizations.org1}]){
  assert.throws(()=>compareNestLocalRecoveryManifest({...base,organizations},{...restore,organizations}),/INVALID_RECOVERY_(SCOPE|SECTIONS)/);
 }
 for(const patch of [{requests:-1},{customers:1.5},{scheduleSlots:'34'},{financialAdjustments:Number.MAX_SAFE_INTEGER+1},{settings:'not-a-digest'},{services:{count:2}},{services:{count:-1,digest:'b'.repeat(64)}}]){
  const broken={...base,organizations:{org1:{...base.organizations.org1,...patch}}};
  assert.throws(()=>validateNestLocalRecoveryManifest(broken),/INVALID_RECOVERY_SECTIONS/);
  assert.throws(()=>compareNestLocalRecoveryManifest(broken,{...broken,projectId:restore.projectId}),/INVALID_RECOVERY_SECTIONS/);
 }
});
test('C20: valid empty collections and absent settings are explicit, not missing sections',()=>{
 const source={...base,organizations:{org1:{settings:null,services:{count:0,digest:'b'.repeat(64)},requests:0,customers:0,scheduleSlots:0,financialAdjustments:0}}};
 assert.equal(compareNestLocalRecoveryManifest(source,{...source,projectId:restore.projectId}).passed,true);
 const missing=structuredClone(source);delete missing.organizations.org1.settings;
 assert.throws(()=>validateNestLocalRecoveryManifest(missing),/INVALID_RECOVERY_SECTIONS/);
});
test('C20: managed backup restore may use an isolated named database in the same project',()=>{
 const source={...base,schemaVersion:2,databaseId:'(default)'},target={...source,databaseId:'nestlocal-recovery-drill'};
 assert.deepEqual(compareNestLocalRecoveryManifest(source,target),{passed:true,findings:[]});
 assert.throws(()=>compareNestLocalRecoveryManifest(source,source),/RECOVERY_DESTINATION_MUST_BE_ISOLATED/);
 assert.throws(()=>compareNestLocalRecoveryManifest(source,{...target,databaseId:'bad/path'}),/INVALID_RECOVERY_DATABASE/);
 assert.throws(()=>compareNestLocalRecoveryManifest(source,{...target,databaseId:undefined}),/INVALID_RECOVERY_DATABASE/);
 assert.throws(()=>compareNestLocalRecoveryManifest(base,{...base,databaseId:'nestlocal-recovery-drill'}),/RECOVERY_DESTINATION_MUST_BE_ISOLATED/);
});
