import {operationalProfiles,canonicalOperationalProfile} from './operational-profiles.mjs';
// Only canonical server-read memberships are passed to these helpers.
export function hasNestLocalPermission(member,permission){
 const permissions=member?.appAccess?.nestlocal?.permissions;
 return member?.permissions?.[permission]===true||
  (Array.isArray(permissions)?permissions.includes(permission):permissions?.[permission]===true);
}
export function nestLocalCapability(member,key){
 const profile=canonicalOperationalProfile(member);
 if(['field','viewer','restricted'].includes(profile))return false;
 if(profile==='finance')return key==='financeWrite';
 const app=member?.appAccess?.nestlocal;
 const explicit=app?.capabilities?.[key];
 if(typeof explicit==='boolean')return explicit;
 const token={financeWrite:'nestlocal.finance.write',sitesWrite:'nestlocal.sites.write'}[key];
 return !!token&&(app?.permissions?.[key]===true||hasNestLocalPermission(member,token));
}
export function prepareNestLocalMemberAccess(previous={},enabled,capabilities,profile){
 if(typeof enabled!=='boolean')throw new TypeError('INVALID_MEMBER_ACCESS');
 if(profile!==undefined&&!operationalProfiles.includes(profile))throw new TypeError('INVALID_MEMBER_PROFILE');
 if(capabilities!==undefined&&(!capabilities||typeof capabilities!=='object'||Array.isArray(capabilities)||
  Object.keys(capabilities).some(key=>!['financeWrite','sitesWrite'].includes(key)||typeof capabilities[key]!=='boolean')))
  throw new TypeError('INVALID_MEMBER_CAPABILITIES');
 // Revocation uses enabled=false. Preserve grants so a seat toggle cannot erase
 // other ecosystem permissions or silently broaden a later reactivation.
 let permissions=previous.permissions;
 if(enabled){
  if(Array.isArray(permissions))permissions=[...new Set([...permissions,'nestlocal.manage'])];
  else if(permissions&&typeof permissions==='object')permissions={...permissions,'nestlocal.manage':true};
  else permissions=['nestlocal.manage'];
 }
 return {...previous,enabled,...(profile===undefined?{}:{profile}),...(permissions===undefined?{}:{permissions}),
  ...(capabilities===undefined?{}:{capabilities:{...previous.capabilities,...capabilities}})};
}
