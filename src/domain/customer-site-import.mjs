import {validateCustomerSite} from './customer-sites.mjs';

export const siteIdentity=site=>[site.label,site.line,site.city].map(x=>x.toLowerCase()).join('|');
export function normalizeSiteImport(input){
 if(!Array.isArray(input)||!input.length||input.length>20)throw new TypeError('INVALID_SITE_IMPORT');
 const sites=input.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row))throw new TypeError('INVALID_SITE_IMPORT');
  for(const [key,max] of [['label',100],['line',180],['city',80],['notes',500]]){
   if(row[key]!==undefined&&(typeof row[key]!=='string'||row[key].length>max||/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(row[key])))throw new TypeError('INVALID_SITE_IMPORT');
  }
  if(!Array.isArray(row.equipment)||row.equipment.some(x=>typeof x!=='string'||x.length>100||/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(x)))throw new TypeError('INVALID_SITE_IMPORT');
  return validateCustomerSite(row);
 });
 if(new Set(sites.map(siteIdentity)).size!==sites.length)throw new TypeError('INVALID_SITE_IMPORT');
 return sites;
}
export function planSiteImport(sites,existing){
 if(existing.length>20)throw new TypeError('CUSTOMER_SITE_LIMIT');
 const byIdentity=new Map();
 for(const row of existing){
  let value;try{value=normalizeSiteImport([row.data])[0]}catch{throw new TypeError('SITE_IMPORT_EXISTING_INVALID')}
  const key=siteIdentity(value);
  if(byIdentity.has(key))throw new TypeError('SITE_IMPORT_EXISTING_INVALID');
  byIdentity.set(key,{id:row.id,value});
 }
 const rows=sites.map((site,index)=>{
  const found=byIdentity.get(siteIdentity(site));
  return {index,label:site.label,line:site.line,city:site.city,equipment:site.equipment,
   status:!found?'create':JSON.stringify(site)===JSON.stringify(found.value)?'existing':'conflict',
   ...(found?{id:found.id}:{})};
 });
 const creates=rows.filter(row=>row.status==='create').length,conflicts=rows.filter(row=>row.status==='conflict').length,
  withinLimit=existing.length+creates<=20;
 return {rows,counts:{create:creates,existing:rows.length-creates-conflicts,conflict:conflicts,totalAfter:existing.length+creates},
  withinLimit,canImport:withinLimit&&conflicts===0&&creates>0};
}

// Uses the existing authorization and database; no parallel identity or direct
// browser database access. Imports only create sites and never overwrite one.
export function registerCustomerSiteImport(app,{db,admin,authenticate,authorize,canManageSites,hash,safeId,sendError,rateLimit}){
 const path='/api/organizations/:orgId/nestlocal/customers/:customerId/sites/import';
 const describe=docs=>docs.map(doc=>({id:doc.id,data:doc.data(),version:doc.updateTime?`${doc.updateTime.seconds}:${doc.updateTime.nanoseconds}`:null}));
 const revision=(customerId,sites,existing)=>hash(JSON.stringify({customerId,sites,
  existing:existing.map(row=>({id:row.id,version:row.version})).sort((a,b)=>a.id.localeCompare(b.id))}));
 const fail=(res,error)=>{
  const code=error?.message;
  if(code==='CUSTOMER_NOT_FOUND')return sendError(res,404,code);
  if(['INVALID_SITE_IMPORT','INVALID_CUSTOMER_SITE','SITE_IMPORT_PREVIEW_REQUIRED','SITE_IMPORT_KEY_REQUIRED'].includes(code))return sendError(res,400,code);
  if(['CUSTOMER_SITE_LIMIT','SITE_IMPORT_EXISTING_INVALID','SITE_IMPORT_PREVIEW_STALE','SITE_IMPORT_CONFLICT','SITE_IMPORT_NO_CHANGES','SITE_IMPORT_KEY_CONFLICT'].includes(code))return sendError(res,409,code);
  console.error('NESTLOCAL_SITE_IMPORT_FAILED',error?.code||error?.name);return sendError(res,500,'CUSTOMER_SITES_UNAVAILABLE');
 };
 for(const preview of [true,false])app.post(path+(preview?'/preview':''),authenticate,authorize,async(req,res)=>{
  if(!canManageSites(req.access))return sendError(res,403,'ACCESS_DENIED');
  const customerId=safeId(req.params.customerId);if(!customerId)return sendError(res,404,'CUSTOMER_NOT_FOUND');
  if(!await rateLimit(req,'customer_site_import:'+customerId,req.access.orgId))return sendError(res,429,'RATE_LIMITED');
  try{
   const sites=normalizeSiteImport(req.body?.sites),root='organizations/'+req.access.orgId,
    base=db.doc(root+'/nestlocal_customers/'+customerId),query=base.collection('sites').limit(21);
   res.set('Cache-Control','private,no-store');
   if(preview){
    const [customer,snapshot]=await Promise.all([base.get(),query.get()]);
    if(!customer.exists)throw new TypeError('CUSTOMER_NOT_FOUND');
    const existing=describe(snapshot.docs),plan=planSiteImport(sites,existing);
    return res.json({...plan,previewToken:revision(customerId,sites,existing)});
   }
   const key=req.body?.operationKey,expected=req.body?.previewToken;
   if(typeof key!=='string'||!/^nl-[A-Za-z0-9_-]{16,80}$/.test(key))throw new TypeError('SITE_IMPORT_KEY_REQUIRED');
   if(typeof expected!=='string'||!/^[a-f0-9]{64}$/.test(expected))throw new TypeError('SITE_IMPORT_PREVIEW_REQUIRED');
   const receipt=db.doc(root+'/nestlocal_site_imports/'+hash(req.identity.uid+'|'+key)),
    payloadHash=hash(JSON.stringify({customerId,sites,expected})),audit=db.collection(root+'/nestlocal_audit').doc();
   let result;
   await db.runTransaction(async tx=>{
    const [customer,prior,snapshot]=await Promise.all([tx.get(base),tx.get(receipt),tx.get(query)]);
    if(!customer.exists)throw new TypeError('CUSTOMER_NOT_FOUND');
    if(prior.exists){
     if(prior.data().payloadHash!==payloadHash)throw new TypeError('SITE_IMPORT_KEY_CONFLICT');
     result={...prior.data().result,idempotent:true};return;
    }
    const existing=describe(snapshot.docs),plan=planSiteImport(sites,existing);
    if(revision(customerId,sites,existing)!==expected)throw new TypeError('SITE_IMPORT_PREVIEW_STALE');
    if(!plan.withinLimit)throw new TypeError('CUSTOMER_SITE_LIMIT');
    if(plan.counts.conflict)throw new TypeError('SITE_IMPORT_CONFLICT');
    if(!plan.canImport)throw new TypeError('SITE_IMPORT_NO_CHANGES');
    const timestamp=()=>admin.firestore.FieldValue.serverTimestamp(),ids=[];
    for(const row of plan.rows){
     if(row.status!=='create')continue;
     const site=sites[row.index],id=hash(customerId+'|'+siteIdentity(site)).slice(0,28);
     // Guard against unexpected legacy IDs instead of replacing any document.
     if(existing.some(value=>value.id===id))throw new TypeError('SITE_IMPORT_CONFLICT');
     tx.create(base.collection('sites').doc(id),{...site,intentHash:hash(JSON.stringify(site)),revision:1,
      createdBy:req.identity.uid,createdAt:timestamp(),updatedAt:timestamp()});ids.push(id);
    }
    tx.update(base,{siteCount:plan.counts.totalAfter,updatedAt:timestamp()});
    result={created:ids.length,existing:plan.counts.existing,siteIds:ids,idempotent:false};
    tx.create(receipt,{customerId,payloadHash,result,actorUid:req.identity.uid,createdAt:timestamp()});
    tx.create(audit,{action:'customers.sites_imported',customerId,created:ids.length,existing:plan.counts.existing,
     actorUid:req.identity.uid,createdAt:timestamp()});
   });
   return res.status(result.idempotent?200:201).json(result);
  }catch(error){return fail(res,error)}
 });
}
