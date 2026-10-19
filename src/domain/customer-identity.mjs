const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
const list=row=>[row.id,...(Array.isArray(row.identityAliases)?row.identityAliases:[])];
const linkFields=['mergedInto','identityMerged','identityAliases','mergeRevision'];
export function customerIdentityView(primary,members){
 const result={...primary},sources=members.map(row=>({...row}));
 const amounts=sources.map(row=>row.lifetimeRevenueCents??0);
 result.lifetimeRevenueCents=amounts.every(x=>Number.isSafeInteger(x)&&x>=0)&&Number.isSafeInteger(amounts.reduce((a,b)=>a+b,0))?amounts.reduce((a,b)=>a+b,0):null;
 result.revenueUnavailable=result.lifetimeRevenueCents===null;
 const due=sources.map(row=>row.nextServiceDate).filter(value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value).sort();
 if(due.length)result.nextServiceDate=due[0];
 const latest=[...sources].sort((a,b)=>(b.lastCompletedAt?.toMillis?.()||Number(b.lastCompletedAt?.seconds||0)*1000||Date.parse(b.lastServiceDate||'')||0)-(a.lastCompletedAt?.toMillis?.()||Number(a.lastCompletedAt?.seconds||0)*1000||Date.parse(a.lastServiceDate||'')||0))[0];
 for(const field of ['lastServiceLabel','lastServiceId','lastServiceDate','lastCompletedAt','lastRequestId'])if(latest?.[field]!==undefined)result[field]=latest[field];
 if(sources.length>1)result.identitySources=sources;
 return result;
}
async function groupOf(get,base,id){
 let head=await get(base.doc(id));if(!head.exists)throw new TypeError('CUSTOMER_NOT_FOUND');
 if(head.data().mergedInto){
  if(!validId(head.data().mergedInto))throw new TypeError('CUSTOMER_IDENTITY_CHANGED');
  head=await get(base.doc(head.data().mergedInto));
 }
 if(!head.exists||head.data().mergedInto)throw new TypeError('CUSTOMER_IDENTITY_CHANGED');
 const ids=list({...head.data(),id:head.id});
 if(ids.length>5||new Set(ids).size!==ids.length||ids.some(id=>!validId(id)))throw new TypeError('CUSTOMER_IDENTITY_CHANGED');
 const docs=await Promise.all(ids.map(id=>id===head.id?head:get(base.doc(id))));
 if(docs.some(doc=>!doc.exists||doc.id!==head.id&&doc.data().mergedInto!==head.id))throw new TypeError('CUSTOMER_IDENTITY_CHANGED');
 return {head,docs,ids};
}
export async function consolidatedCustomers(db,root,rows){
 let base;const groups=new Map(),result=[];
 for(const row of rows){
  if(!row.mergedInto&&!row.identityAliases?.length){result.push(row);continue}
  const id=row.mergedInto||row.id;
  base??=db.collection(root+'/nestlocal_customers');
  if(!groups.has(id))groups.set(id,groupOf(ref=>ref.get(),base,id));
 }
 for(const pending of groups.values()){
  const group=await pending;result.push(customerIdentityView({...group.head.data(),id:group.head.id},group.docs.map(doc=>({...doc.data(),id:doc.id}))));
 }
 return result;
}
export function registerCustomerIdentity(app,{db,admin,authenticate,authorize,canManage,hash,safeId,sendError}){
 const route='/api/organizations/:orgId/nestlocal/customers/merge';
 const versions=groups=>groups.flatMap(group=>group.docs).map(doc=>({id:doc.id,version:`${doc.updateTime?.seconds}:${doc.updateTime?.nanoseconds}`})).sort((a,b)=>a.id.localeCompare(b.id));
 const fail=(res,error)=>{
  const code=error?.message||'';
  if(code==='CUSTOMER_NOT_FOUND')return sendError(res,404,code);
  if(code.startsWith('INVALID_CUSTOMER_MERGE'))return sendError(res,400,code);
  if(['CUSTOMER_IDENTITY_CHANGED','CUSTOMER_MERGE_STALE','CUSTOMER_MERGE_SAME','CUSTOMER_MERGE_LIMIT','CUSTOMER_MERGE_KEY_CONFLICT','CUSTOMER_MERGE_UNDO_CONFLICT'].includes(code))return sendError(res,409,code);
  console.error('NESTLOCAL_CUSTOMER_IDENTITY_FAILED',error?.code||error?.name);return sendError(res,500,'CUSTOMER_IDENTITY_UNAVAILABLE');
 };
 for(const preview of [true,false])app.post(route+(preview?'/preview':''),authenticate,authorize,async(req,res)=>{
  if(!canManage(req.access))return sendError(res,403,'ACCESS_DENIED');
  try{
   const sourceId=safeId(req.body?.sourceId),targetId=safeId(req.body?.targetId),reason=String(req.body?.reason||'').trim();
   if(!sourceId||!targetId||reason.length<8||reason.length>300)throw new TypeError('INVALID_CUSTOMER_MERGE');
   if(sourceId===targetId)throw new TypeError('CUSTOMER_MERGE_SAME');
   const root='organizations/'+req.access.orgId,base=db.collection(root+'/nestlocal_customers');
   const makePlan=async get=>{
    const groups=await Promise.all([groupOf(get,base,sourceId),groupOf(get,base,targetId)]),[source,target]=groups;
    if(source.head.id===target.head.id)throw new TypeError('CUSTOMER_MERGE_SAME');
    if(source.ids.length+target.ids.length>5)throw new TypeError('CUSTOMER_MERGE_LIMIT');
    const token=hash(JSON.stringify({source:source.head.id,target:target.head.id,reason,versions:versions(groups)}));
    return {source,target,token};
   };
   res.set('Cache-Control','private,no-store');
   if(preview){
    const {source,target,token}=await makePlan(ref=>ref.get());
    const contacts=group=>group.docs.map(doc=>({id:doc.id,name:doc.data().name||'',phone:doc.data().phone||'',email:doc.data().email||''}));
    return res.json({source:contacts(source),target:contacts(target),previewToken:token,preservesOriginals:true});
   }
   const operationKey=req.body?.operationKey,expected=req.body?.previewToken;
   if(typeof operationKey!=='string'||!/^nl-[A-Za-z0-9_-]{16,80}$/.test(operationKey)||typeof expected!=='string'||!/^[a-f0-9]{64}$/.test(expected))throw new TypeError('INVALID_CUSTOMER_MERGE_CONFIRMATION');
   const operationId=hash(req.identity.uid+'|'+operationKey),receipt=db.doc(root+'/nestlocal_customer_merges/'+operationId),
    payloadHash=hash(JSON.stringify({sourceId,targetId,reason,expected}));let result;
   await db.runTransaction(async tx=>{
    const prior=await tx.get(receipt);
    if(prior.exists){if(prior.data().payloadHash!==payloadHash)throw new TypeError('CUSTOMER_MERGE_KEY_CONFLICT');if(prior.data().undoneAt)throw new TypeError('CUSTOMER_MERGE_UNDO_CONFLICT');result={...prior.data().result,idempotent:true};return}
    const {source,target,token}=await makePlan(ref=>tx.get(ref));
    if(token!==expected)throw new TypeError('CUSTOMER_MERGE_STALE');
    const docs=[...target.docs,...source.docs],ids=docs.map(doc=>doc.id),before=docs.map(doc=>({id:doc.id,links:Object.fromEntries(linkFields.map(field=>[field,doc.data()[field]??null]))}));
    for(const doc of docs)tx.update(doc.ref,doc.id===target.head.id?
     {identityAliases:ids.filter(id=>id!==doc.id),identityMerged:false,mergedInto:admin.firestore.FieldValue.delete(),mergeRevision:operationId}:
     {mergedInto:target.head.id,identityMerged:true,identityAliases:admin.firestore.FieldValue.delete(),mergeRevision:operationId});
    result={targetId:target.head.id,identityCount:ids.length,mergeId:operationId,idempotent:false};
    tx.create(receipt,{payloadHash,before,result,reason,actorUid:req.identity.uid,createdAt:admin.firestore.FieldValue.serverTimestamp()});
    tx.create(db.collection(root+'/nestlocal_audit').doc(),{action:'customers.merged',mergeId:operationId,identityCount:ids.length,actorUid:req.identity.uid,createdAt:admin.firestore.FieldValue.serverTimestamp()});
   });
   return res.json(result);
  }catch(error){return fail(res,error)}
 });
 app.post(route+'/:mergeId/undo',authenticate,authorize,async(req,res)=>{
  if(!canManage(req.access))return sendError(res,403,'ACCESS_DENIED');
  try{
   const id=safeId(req.params.mergeId),reason=String(req.body?.reason||'').trim();
   if(!id||reason.length<8||reason.length>300)throw new TypeError('INVALID_CUSTOMER_MERGE');
   const root='organizations/'+req.access.orgId,receipt=db.doc(root+'/nestlocal_customer_merges/'+id);let idempotent=false;
   await db.runTransaction(async tx=>{
    const previous=await tx.get(receipt);if(!previous.exists)throw new TypeError('CUSTOMER_NOT_FOUND');
    const record=previous.data();if(record.undoneAt){idempotent=true;return}
    const before=record.before;
    if(!Array.isArray(before)||before.length<2||before.length>5||before.some(row=>!validId(row.id)))throw new TypeError('CUSTOMER_MERGE_UNDO_CONFLICT');
    const docs=await Promise.all(before.map(row=>tx.get(db.doc(root+'/nestlocal_customers/'+row.id))));
    if(docs.some(doc=>!doc.exists||doc.data().mergeRevision!==id))throw new TypeError('CUSTOMER_MERGE_UNDO_CONFLICT');
    for(let i=0;i<docs.length;i++)tx.update(docs[i].ref,Object.fromEntries(linkFields.map(field=>[field,before[i].links[field]??admin.firestore.FieldValue.delete()])));
    tx.update(receipt,{undoneAt:admin.firestore.FieldValue.serverTimestamp(),undoneBy:req.identity.uid,undoReason:reason});
    tx.create(db.collection(root+'/nestlocal_audit').doc(),{action:'customers.merge_undone',mergeId:id,actorUid:req.identity.uid,createdAt:admin.firestore.FieldValue.serverTimestamp()});
   });
   return res.json({undone:true,idempotent});
  }catch(error){return fail(res,error)}
 });
 app.get('/api/organizations/:orgId/nestlocal/customers/:customerId/history',authenticate,authorize,async(req,res)=>{
  try{
   const id=safeId(req.params.customerId),cursor=safeId(req.query.cursor||'');if(!id)throw new TypeError('CUSTOMER_NOT_FOUND');
   if(req.query.cursor&&!cursor)throw new TypeError('INVALID_CUSTOMER_MERGE_CURSOR');
   const root='organizations/'+req.access.orgId,group=await groupOf(ref=>ref.get(),db.collection(root+'/nestlocal_customers'),id);
   let query=db.collection(root+'/nestlocal_requests').where('customerId','in',group.ids).orderBy(admin.firestore.FieldPath.documentId());if(cursor)query=query.startAfter(cursor);
   const page=await query.limit(51).get(),docs=page.docs.slice(0,50),items=docs.map(doc=>{
    const row={id:doc.id,...doc.data()};for(const key of ['trackingTokenHash','trackingTokenHashes','reviewTokenHash','reviewTokenHashes'])delete row[key];return row;
   });
   res.set('Cache-Control','private,no-store');return res.json({items,hasMore:page.size>50,nextCursor:page.size>50?docs.at(-1).id:null});
  }catch(error){return fail(res,error)}
 });
}
