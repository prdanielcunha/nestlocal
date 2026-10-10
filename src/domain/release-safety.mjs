import crypto from 'node:crypto';
// Hash private Firebase documents without serializing any raw PII into a release report.
function normalize(value){
 if(value===null||value===undefined)return null;
 if(value instanceof Date)return value.toISOString();
 if(typeof value?.toDate==='function')return value.toDate().toISOString();
 if(Array.isArray(value))return value.map(normalize);
 if(typeof value==='object'){
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalize(value[k])]));
 }
 return value;
}
export function fingerprint(value,salt){
 if(typeof salt!=='string'||salt.length<16)throw Error('AUDIT_SALT_REQUIRED');
 return crypto.createHmac('sha256',salt).update(JSON.stringify(normalize(value))).digest('hex');
}
export function protectedHubProjection(record){
 const obj=record||{},app=obj.apps?.musicscale||null;
 const legacyKeys=['stripeSubscriptionId','stripeCustomerId','subscriptionStatus','plan',
  'status','stripePriceId','customerId','subscriptionId','trialUsed','musicscale'];
 const legacy=Object.fromEntries(legacyKeys.filter(k=>Object.hasOwn(obj,k)).map(k=>[k,obj[k]]));
 return {apps:{musicscale:app},legacy};
}
export function protectedOrganizationProjection(record){
 const obj=record||{};
 return {apps:{musicscale:obj.apps?.musicscale||null},
  ownerUid:obj.ownerUid||null,status:obj.status||null,enabled:obj.enabled!==false};
}
export function protectedMembershipProjection(record){
 const obj={...(record||{})};
 if(obj.apps){obj.apps={...obj.apps};delete obj.apps.nestlocal}
 if(obj.appAccess){obj.appAccess={...obj.appAccess};delete obj.appAccess.nestlocal}
 delete obj.updatedAt;
 return obj;
}
export function signatureForCollection(docs,salt,project=x=>x){
 const pairs=[...docs].map(doc=>[fingerprint(doc.id,salt),fingerprint(project(doc.data()||{}),salt)]);
 pairs.sort((a,b)=>a[0].localeCompare(b[0]));
 return {count:pairs.length,digest:fingerprint(pairs,salt)};
}
export function compareReleaseSnapshots(before,after){
 if(!before||!after||before.schemaVersion!==1||after.schemaVersion!==1)
  throw Error('INVALID_RELEASE_SNAPSHOTS');
 if(before.projectId!==after.projectId)throw Error('PROJECT_MISMATCH');
 const beforeIds=Object.keys(before.organizations||{}).sort(),afterIds=Object.keys(after.organizations||{}).sort();
 if(JSON.stringify(beforeIds)!==JSON.stringify(afterIds))throw Error('ORGANIZATION_SET_MISMATCH');
 const changes=[];
 for(const id of beforeIds){
  const a=before.organizations[id],b=after.organizations[id];
  for(const section of Object.keys(a||{})){
   if(JSON.stringify(a[section])!==JSON.stringify(b?.[section]))changes.push({organizationId:id,section});
  }
  for(const section of Object.keys(b||{})){
   if(!(section in (a||{})))changes.push({organizationId:id,section});
  }
 }
 return {passed:changes.length===0,changes};
}
