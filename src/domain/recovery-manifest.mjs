// Read-only fingerprints intended to verify a controlled restore in an isolated
// Firebase project. This is NOT a backup and can never reconstruct records.
export function compareNestLocalRecoveryManifest(before,after){
  if(!before||!after||before.schemaVersion!==1||after.schemaVersion!==1)
    throw new TypeError('INVALID_RECOVERY_MANIFEST');
  if(before.projectId===after.projectId)throw new TypeError('RECOVERY_DESTINATION_MUST_BE_ISOLATED');
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
