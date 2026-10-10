import test from 'node:test';
import assert from 'node:assert/strict';
import {fingerprint,protectedHubProjection,protectedOrganizationProjection,
 protectedMembershipProjection,signatureForCollection,compareReleaseSnapshots} from '../src/domain/release-safety.mjs';
const salt='secret-only-for-local-tests';
test('NestLocal payment fields cannot modify MusicScale protection fingerprint',()=>{
 const a={apps:{musicscale:{status:'active',plan:'pro'},nestlocal:{status:'trialing'}},subscriptionStatus:'active',updatedAt:1};
 const b={...a,apps:{...a.apps,nestlocal:{status:'paid_active'}},updatedAt:2};
 assert.equal(fingerprint(protectedHubProjection(a),salt),fingerprint(protectedHubProjection(b),salt));
 const c={...b,apps:{...b.apps,musicscale:{status:'inactive',plan:'pro'}}};
 assert.notEqual(fingerprint(protectedHubProjection(a),salt),fingerprint(protectedHubProjection(c),salt));
});
test('tenant membership hashes ignore only NestLocal app grant, not MusicScale roles',()=>{
 const a={role:'owner',appAccess:{musicscale:{role:'leader'},nestlocal:{enabled:false}},updatedAt:1};
 const b={...a,appAccess:{...a.appAccess,nestlocal:{enabled:true}},updatedAt:2};
 assert.equal(fingerprint(protectedMembershipProjection(a),salt),fingerprint(protectedMembershipProjection(b),salt));
 const c={...b,appAccess:{...b.appAccess,musicscale:{role:'member'}}};
 assert.notEqual(fingerprint(protectedMembershipProjection(a),salt),fingerprint(protectedMembershipProjection(c),salt));
});
test('fixed-band scale delete and content edit are detectable without listing raw data',()=>{
 const mk=(id,data)=>({id,data:()=>data});
 const a=signatureForCollection([mk('one',{organizationId:'o',title:'Band A'}),mk('two',{status:'scheduled'})],salt);
 const b=signatureForCollection([mk('two',{status:'scheduled'})],salt);
 const c=signatureForCollection([mk('one',{organizationId:'o',title:'Band B'}),mk('two',{status:'scheduled'})],salt);
 assert.notEqual(a.digest,b.digest);assert.notEqual(a.digest,c.digest);
 assert.equal(JSON.stringify(a).includes('Band A'),false);
});
test('snapshots compare organization sets and protected groups strictly',()=>{
 const a={schemaVersion:1,projectId:'project',organizations:{org:{fixedBandScales:{count:2,digest:'1'},subscriptions:'ok'}}};
 assert.deepEqual(compareReleaseSnapshots(a,{...a}),{passed:true,changes:[]});
 assert.deepEqual(compareReleaseSnapshots(a,{...a,organizations:{org:{...a.organizations.org,fixedBandScales:{count:1,digest:'2'}}}}).changes,[{organizationId:'org',section:'fixedBandScales'}]);
 assert.throws(()=>compareReleaseSnapshots(a,{...a,organizations:{other:{}}}),/ORGANIZATION_SET_MISMATCH/);
});
test('stable canonical fingerprints use a required secret salt',()=>{
 assert.equal(fingerprint({b:1,a:2},salt),fingerprint({a:2,b:1},salt));
 assert.throws(()=>fingerprint({a:1},'tiny'),/AUDIT_SALT_REQUIRED/);
 assert.ok(protectedOrganizationProjection({apps:{nestlocal:{status:'active'},musicscale:{status:'active'}}}).apps.musicscale);
});
