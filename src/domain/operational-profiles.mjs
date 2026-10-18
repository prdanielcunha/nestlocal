export const operationalProfiles=Object.freeze(['legacy','operations','finance','field','viewer']);
export function canonicalOperationalProfile(member,{administrator=false}={}){
 if(administrator)return 'admin';
 const profile=member?.appAccess?.nestlocal?.profile;
 return profile===undefined?'legacy':operationalProfiles.includes(profile)?profile:'restricted';
}
const ownChannel=(method,path)=>
 (path==='/calendar/feed'&&['POST','DELETE'].includes(method))||
 (path==='/push/devices'&&['POST','DELETE'].includes(method))||
 (path==='/push/test'&&method==='POST');
export function operationalRouteAllowed(profile,method,path,body={}){
 if(['admin','legacy','operations'].includes(profile))return true;
 if(profile==='restricted')return false;
 if(ownChannel(method,path))return true;
 if(profile==='viewer')return ['GET','HEAD','OPTIONS'].includes(method);
 if(profile==='finance')return method==='GET'||
  (method==='POST'&&/^\/requests\/[A-Za-z0-9_-]+\/quote$/.test(path))||
  (method==='PATCH'&&/^\/requests\/[A-Za-z0-9_-]+$/.test(path)&&
   Object.keys(body).length>0&&Object.keys(body).every(key=>['finalAmountCents','amountPaidCents','paymentStatus'].includes(key)));
 if(profile!=='field')return false;
 if(method==='GET')return path===''||['/lists/requests/page','/agenda/page','/calendar/feed/status','/push/config'].includes(path)||
  /^\/requests\/[A-Za-z0-9_-]+(?:\/(?:photos|evidence)\/\d+)?$/.test(path);
 if(method==='POST')return /^\/requests\/[A-Za-z0-9_-]+\/evidence$/.test(path);
 return method==='PATCH'&&/^\/requests\/[A-Za-z0-9_-]+$/.test(path)&&
  Object.keys(body).length>0&&Object.keys(body).every(key=>['status','executionNotes','executionChecklist'].includes(key))&&
  (body.status===undefined||['in_progress','completed'].includes(body.status));
}
export function assignedRequest(record,uid){return !!uid&&record?.schedule?.assignedTo===uid}
// A whitelist prevents future financial/internal fields leaking to field staff.
export function fieldRequestView(id,record,uid){
 if(!assignedRequest(record,uid))throw new TypeError('ASSIGNMENT_ACCESS_DENIED');
 const pick=(source,keys)=>Object.fromEntries(keys.filter(key=>source?.[key]!==undefined).map(key=>[key,source[key]]));
 return {id,...pick(record,['status','serviceId','quantity','equipmentType','safeAccess','intake','note']),
  customer:pick(record.customer,['name','phone']),address:pick(record.address,['line','city','coverageCode']),
  schedule:pick(record.schedule,['date','window','assignedTo','revision']),
  execution:{...pick(record.execution,['notes','startedAt','completedAt']),checklist:(Array.isArray(record.execution?.checklist)?record.execution.checklist:[]).map(row=>pick(row,['id','label','done','order']))},
  workEvidence:(Array.isArray(record.workEvidence)?record.workEvidence:[]).map(row=>pick(row,['contentType','phase','note','uploadedAt'])),
  attachments:(Array.isArray(record.attachments)?record.attachments:[]).map(row=>pick(row,['contentType']))};
}
