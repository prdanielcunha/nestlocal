import test from 'node:test';
import assert from 'node:assert/strict';
import {hasNestLocalPermission,nestLocalCapability,prepareNestLocalMemberAccess} from '../src/domain/member-permissions.mjs';
const member=app=>({appAccess:{nestlocal:app}});
test('canonical permission arrays and maps authorize consistently; explicit revocation overrides legacy grants',()=>{
 for(const permissions of [['nestlocal.manage','nestlocal.finance.write'],{'nestlocal.manage':true,financeWrite:true}]){
  const record=member({permissions});
  assert.equal(hasNestLocalPermission(record,'nestlocal.manage'),true);
  assert.equal(nestLocalCapability(record,'financeWrite'),true);
  record.appAccess.nestlocal.capabilities={financeWrite:false};
  assert.equal(nestLocalCapability(record,'financeWrite'),false);
 }
 assert.equal(hasNestLocalPermission(member({permissions:'nestlocal.manage'}),'nestlocal.manage'),false);
 assert.equal(nestLocalCapability(member({permissions:{sitesWrite:'true'}}),'sitesWrite'),false);
});
test('seat toggles preserve unrelated permissions and capabilities without granting financial access',()=>{
 const previous={enabled:true,permissions:['nestlocal.manage','custom.permission'],capabilities:{sitesWrite:true,financeWrite:false},custom:'retained'};
 const disabled=prepareNestLocalMemberAccess(previous,false);
 const enabled=prepareNestLocalMemberAccess(disabled,true);
 assert.deepEqual(enabled,previous);assert.equal(disabled.enabled,false);
 const map=prepareNestLocalMemberAccess({permissions:{financeWrite:true}},true,{sitesWrite:true});
 assert.equal(map.permissions.financeWrite,true);assert.equal(map.permissions['nestlocal.manage'],true);
 assert.equal(map.capabilities.sitesWrite,true);
 assert.equal(nestLocalCapability(member(prepareNestLocalMemberAccess({},true)),'financeWrite'),false);
});
test('capabilities cannot set admin flags, truthy strings or malformed access',()=>{
 for(const capabilities of [{admin:true},{financeWrite:'true'},[],null])
  assert.throws(()=>prepareNestLocalMemberAccess({},true,capabilities),/INVALID_MEMBER_CAPABILITIES/);
 assert.throws(()=>prepareNestLocalMemberAccess({},'true'),/INVALID_MEMBER_ACCESS/);
});
