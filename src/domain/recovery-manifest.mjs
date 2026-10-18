// Read-only fingerprints intended to verify a controlled restore in an isolated
// Firebase database. This is NOT a backup and can never reconstruct records.
export function compareNestLocalRecoveryManifest(before,after){
  if(!before||!after||![1,2].includes(before.schemaVersion)||before.schemaVersion!==after.schemaVersion||
     typeof before.projectId!=='string'||!before.projectId||typeof after.projectId!=='string'||!after.projectId)
    throw new TypeError('INVALID_RECOVERY_MANIFEST');
  if(before.schemaVersion===2&&(!validRecoveryDatabaseId(before.databaseId)||!validRecoveryDatabaseId(after.databaseId)))
    throw new TypeError('INVALID_RECOVERY_DATABASE');
  if(before.projectId===after.projectId&&(before.schemaVersion===1||before.databaseId===after.databaseId))
    throw new TypeError('RECOVERY_DESTINATION_MUST_BE_ISOLATED');
  const a=Object.keys(before.organizations||{}).sort(),b=Object.keys(after.organizations||{}).sort();
  if(JSON.stringify(a)!==JSON.stringify(b))throw new TypeError('RECOVERY_SCOPE_MISMATCH');
  const findings=[];
  for(const orgId of a){
    for(const key of ['settings','services','requests','customers','scheduleSlots','financialAdjustments']){
      const initial=before.organizations[orgId]?.[key],restored=after.organizations[orgId]?.[key];
      if(JSON.stringify(initial)!==JSON.stringify(restored))findings.push({organizationId:orgId,section:key});
    }
  }
  return {passed:findings.length===0,findings};
}
export function validRecoveryDatabaseId(value){return value==='(default)'||typeof value==='string'&&/^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(value)&&!(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value))}
