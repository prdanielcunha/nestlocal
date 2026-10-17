import test from 'node:test';
import assert from 'node:assert/strict';
import {compareNestLocalRecoveryManifest} from '../src/domain/recovery-manifest.mjs';

const base={schemaVersion:1,projectId:'nestlocal-production',organizations:{
 org1:{settings:'hashA',services:{count:2,digest:'hashB'},requests:251,
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
 extra.organizations.org2={};
 assert.throws(()=>compareNestLocalRecoveryManifest(base,extra),{message:'RECOVERY_SCOPE_MISMATCH'});
});
