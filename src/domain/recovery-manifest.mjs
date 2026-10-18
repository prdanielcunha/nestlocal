// Read-only fingerprints intended to verify a controlled restore in an isolated
// Firebase database. This is NOT a backup and can never reconstruct records.
const sections=['settings','services','requests','customers','scheduleSlots','financialAdjustments'];
const validCount=value=>Number.isSafeInteger(value)&&value>=0;
const validDigest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function validateNestLocalRecoveryManifest(manifest){
  if(!manifest||![1,2].includes(manifest.schemaVersion)||typeof manifest.projectId!=='string'||!manifest.projectId.trim())
    throw new TypeError('INVALID_RECOVERY_MANIFEST');
  if(manifest.schemaVersion===2&&!validRecoveryDatabaseId(manifest.databaseId))throw new TypeError('INVALID_RECOVERY_DATABASE');
  const organizations=manifest.organizations;
  if(!organizations||typeof organizations!=='object'||Array.isArray(organizations))throw new TypeError('INVALID_RECOVERY_SCOPE');
  const ids=Object.keys(organizations);
  if(!ids.length||ids.length>50||ids.some(id=>!/^[A-Za-z0-9_-]{1,128}$/.test(id)))throw new TypeError('INVALID_RECOVERY_SCOPE');
  for(const id of ids){
    const row=organizations[id];
    if(!row||sections.some(key=>!Object.hasOwn(row,key))||
      !(row.settings===null||validDigest(row.settings))||
      !validCount(row.services?.count)||!validDigest(row.services?.digest)||
      sections.slice(2).some(key=>!validCount(row[key])))throw new TypeError('INVALID_RECOVERY_SECTIONS');
  }
  return manifest;
}
export function compareNestLocalRecoveryManifest(before,after){
  validateNestLocalRecoveryManifest(before);validateNestLocalRecoveryManifest(after);
  if(before.schemaVersion!==after.schemaVersion)throw new TypeError('INVALID_RECOVERY_MANIFEST');
  if(before.projectId===after.projectId&&(before.schemaVersion===1||before.databaseId===after.databaseId))
    throw new TypeError('RECOVERY_DESTINATION_MUST_BE_ISOLATED');
  const a=Object.keys(before.organizations||{}).sort(),b=Object.keys(after.organizations||{}).sort();
  if(JSON.stringify(a)!==JSON.stringify(b))throw new TypeError('RECOVERY_SCOPE_MISMATCH');
  const findings=[];
  for(const orgId of a){
    for(const key of sections){
      const initial=before.organizations[orgId]?.[key],restored=after.organizations[orgId]?.[key];
      if(JSON.stringify(initial)!==JSON.stringify(restored))findings.push({organizationId:orgId,section:key});
    }
  }
  return {passed:findings.length===0,findings};
}
export function validRecoveryDatabaseId(value){return value==='(default)'||typeof value==='string'&&/^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(value)&&!(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value))}
