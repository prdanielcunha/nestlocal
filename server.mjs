import express from 'express';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import multer from 'multer';
import { quote } from './src/domain/quote.mjs';

admin.initializeApp({projectId: process.env.FIREBASE_PROJECT_ID || 'millionsnest',storageBucket:process.env.FIREBASE_STORAGE_BUCKET||'millionsnest.firebasestorage.app'});
const db=admin.firestore();
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'128kb'}));

const globalRoles=new Set(['ceo','global_admin','ecosystem_owner','founder','admin']);
const clean=v=>typeof v==='string'?v.trim():'';
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,60);
const phone=v=>clean(v).replace(/\D/g,'').slice(0,15);
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const token=()=>crypto.randomBytes(24).toString('base64url');
const safeId=v=>{const s=clean(v);return /^[A-Za-z0-9_-]{1,128}$/.test(s)?s:''};
const validImage=file=>(file.mimetype==='image/jpeg'&&file.buffer[0]===0xff&&file.buffer[1]===0xd8&&file.buffer[2]===0xff)||(file.mimetype==='image/png'&&file.buffer.subarray(0,4).equals(Buffer.from([0x89,0x50,0x4e,0x47])))||(file.mimetype==='image/webp'&&file.buffer.subarray(0,4).toString()==='RIFF'&&file.buffer.subarray(8,12).toString()==='WEBP');
const inactive=d=>d?.enabled===false||['inactive','suspended','disabled','removed','revoked','archived'].includes(d?.status);
const sendError=(res,status,code)=>res.status(status).json({error:code});
const upload=multer({storage:multer.memoryStorage(),limits:{files:5,fileSize:5*1024*1024},fileFilter:(_req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});

async function authenticate(req,res,next){
  const value=req.headers.authorization||'';
  if(!value.startsWith('Bearer ')) return sendError(res,401,'AUTH_REQUIRED');
  try{req.identity=await admin.auth().verifyIdToken(value.slice(7));next()}catch{return sendError(res,401,'INVALID_TOKEN')}
}

async function authorize(req,res,next){
  const orgId=clean(req.params.orgId);
  if(!orgId) return sendError(res,400,'ORGANIZATION_REQUIRED');
  const [user,org,member]=await Promise.all([
    db.doc(`users/${req.identity.uid}`).get(),db.doc(`organizations/${orgId}`).get(),db.doc(`organizations/${orgId}/members/${req.identity.uid}`).get()
  ]);
  if(!user.exists||!org.exists||inactive(user.data())||inactive(org.data())) return sendError(res,403,'ACCESS_DENIED');
  const systemRole=user.data()?.systemRole;
  const m=member.data();
  const allowed=globalRoles.has(systemRole)||(member.exists&&!inactive(m)&&(['owner','admin'].includes(m?.role||m?.organizationRole)||m?.permissions?.['nestlocal.manage']===true));
  if(!allowed) return sendError(res,403,'ACCESS_DENIED');
  req.access={orgId,org:{id:org.id,...org.data()},systemRole,member:m||null};next();
}

async function resolveOrganization(storeSlug){
  const s=slug(storeSlug); if(!s) return null;
  const directory=await db.doc(`nestlocal_public_stores/${s}`).get();
  const orgId=safeId(directory.data()?.organizationId);if(!directory.exists||!orgId)return null;
  return {id:orgId};
}

async function rateLimit(req,key,orgId){
  const window=Math.floor(Date.now()/60000); const ip=clean(req.headers['x-forwarded-for']||req.ip).split(',')[0];
  const ref=db.doc(`organizations/${orgId}/nestlocal_rate_limits/${hash(`${key}:${ip}:${window}`).slice(0,32)}`);
  return db.runTransaction(async tx=>{const snap=await tx.get(ref);const count=(snap.data()?.count||0)+1;if(count>12)return false;tx.set(ref,{count,expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+120000)},{merge:true});return true});
}

app.get('/health',(_req,res)=>res.json({ok:true,service:'nestlocal-api'}));
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'nestlocal-api'}));

app.get('/api/public/stores/:storeSlug',async(req,res)=>{
  try{const org=await resolveOrganization(req.params.storeSlug);if(!org)return sendError(res,404,'STORE_NOT_FOUND');const settings=await db.doc(`organizations/${org.id}/nestlocal_settings/public`).get();if(!settings.exists||settings.data()?.published!==true)return sendError(res,404,'STORE_NOT_FOUND');const services=await db.collection(`organizations/${org.id}/nestlocal_services`).where('published','==',true).get();res.set('Cache-Control','public,max-age=60');res.json({store:{slug:settings.data().slug,businessName:settings.data().businessName||org.name,coverageCodes:settings.data().coverageCodes||[],whatsapp:settings.data().whatsapp||'',currency:'BRL'},services:services.docs.map(x=>({id:x.id,...x.data()}))})}catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}});

app.post('/api/public/stores/:storeSlug/requests',async(req,res)=>{
  try{
    const org=await resolveOrganization(req.params.storeSlug);if(!org)return sendError(res,404,'STORE_NOT_FOUND');
    if(!(await rateLimit(req,'request',org.id)))return sendError(res,429,'RATE_LIMITED');
    const body=req.body||{};const name=clean(body.name).slice(0,100),customerPhone=phone(body.phone),serviceId=clean(body.serviceId),coverageCode=slug(body.coverageCode),quantity=Number(body.quantity),addressLine=clean(body.addressLine).slice(0,180),preferredDate=clean(body.preferredDate).slice(0,10),preferredWindow=clean(body.preferredWindow).slice(0,30);
    if(name.length<2||customerPhone.length<10||!serviceId||!coverageCode||addressLine.length<5||!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)||!['morning','afternoon','evening','flexible'].includes(preferredWindow)||!Number.isSafeInteger(quantity)||quantity<1||quantity>10||body.acceptedTerms!==true)return sendError(res,400,'INVALID_REQUEST');
    const [settingsSnap,servicesSnap]=await Promise.all([db.doc(`organizations/${org.id}/nestlocal_settings/public`).get(),db.collection(`organizations/${org.id}/nestlocal_services`).where('published','==',true).get()]);
    if(!settingsSnap.exists||settingsSnap.data()?.published!==true)return sendError(res,409,'STORE_NOT_READY');
    const settings=settingsSnap.data();const services=servicesSnap.docs.map(x=>({id:x.id,...x.data()}));
    const result=quote({catalog:{organizationId:org.id,version:clean(settings.catalogVersion),status:'published',currency:'BRL',validForMinutes:Number(settings.validForMinutes||30),coverageCodes:settings.coverageCodes||[],services},request:{serviceId,quantity,coverageCode,equipmentType:clean(body.equipmentType),safeAccess:body.safeAccess===true},now:new Date()});
    const publicToken=`${org.id}.${token()}`;const requestRef=db.collection(`organizations/${org.id}/nestlocal_requests`).doc();const customerId=hash(customerPhone).slice(0,28);
    const record={organizationId:org.id,customerId,customer:{name,phone:customerPhone},address:{line:addressLine,city:clean(body.city).slice(0,80),coverageCode},preference:{date:preferredDate,window:preferredWindow},serviceId,quantity,equipmentType:clean(body.equipmentType).slice(0,40),safeAccess:body.safeAccess===true,note:clean(body.note).slice(0,1000),status:'new',quote:{...result,reasons:[...result.reasons]},trackingTokenHash:hash(publicToken),consent:{accepted:true,version:'pilot-2026-09',acceptedAt:admin.firestore.FieldValue.serverTimestamp()},source:'public_store',createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()};
    const batch=db.batch();batch.create(requestRef,record);batch.set(db.doc(`organizations/${org.id}/nestlocal_customers/${customerId}`),{name,phone:customerPhone,lastRequestAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});await batch.commit();
    res.status(201).json({requestId:requestRef.id,trackingToken:publicToken,outcome:result.outcome,quote:{currency:result.currency,totalCents:result.totalCents,expiresAt:result.expiresAt,reasons:[...result.reasons]}});
  }catch(e){console.error(e);sendError(res,e instanceof TypeError?409:500,e instanceof TypeError?'QUOTE_UNAVAILABLE':'INTERNAL_ERROR')}
});

app.get('/api/public/requests/:requestId',async(req,res)=>{
  try{const id=safeId(req.params.requestId),t=clean(req.query.token),orgId=safeId(t.split('.')[0]);if(!id||!orgId||!t)return sendError(res,404,'NOT_FOUND');const doc=await db.doc(`organizations/${orgId}/nestlocal_requests/${id}`).get();if(!doc.exists||doc.data().trackingTokenHash!==hash(t))return sendError(res,404,'NOT_FOUND');const d=doc.data();res.json({id:doc.id,status:d.status,serviceId:d.serviceId,quantity:d.quantity,quote:d.quote,createdAt:d.createdAt})}catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}});

app.post('/api/public/requests/:requestId/photos',upload.array('photos',5),async(req,res)=>{
  try{const id=safeId(req.params.requestId),t=clean(req.query.token),orgId=safeId(t.split('.')[0]);if(!id||!orgId||!t)return sendError(res,404,'NOT_FOUND');if(!(await rateLimit(req,'photos',orgId)))return sendError(res,429,'RATE_LIMITED');const ref=db.doc(`organizations/${orgId}/nestlocal_requests/${id}`),doc=await ref.get();if(!doc.exists||doc.data().trackingTokenHash!==hash(t))return sendError(res,404,'NOT_FOUND');const files=Array.isArray(req.files)?req.files:[];if(!files.length)return sendError(res,400,'PHOTOS_REQUIRED');if(!files.every(validImage))return sendError(res,415,'INVALID_PHOTO');const bucket=admin.storage().bucket();const saved=[];for(const [index,file] of files.entries()){const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.mimetype];const path=`organizations/${orgId}/nestlocal/requests/${id}/${Date.now()}-${index}.${ext}`;await bucket.file(path).save(file.buffer,{resumable:false,metadata:{contentType:file.mimetype,cacheControl:'private,max-age=0',metadata:{organizationId:orgId,requestId:id}}});saved.push({path,contentType:file.mimetype,size:file.size})}await ref.update({attachments:admin.firestore.FieldValue.arrayUnion(...saved),updatedAt:admin.firestore.FieldValue.serverTimestamp()});res.status(201).json({uploaded:saved.length})}catch(e){console.error(e);sendError(res,e?.code==='LIMIT_FILE_SIZE'?413:500,e?.code==='LIMIT_FILE_SIZE'?'PHOTO_TOO_LARGE':'UPLOAD_FAILED')}});

app.get('/api/session',authenticate,async(req,res)=>{
  try{const user=await db.doc(`users/${req.identity.uid}`).get();if(!user.exists)return sendError(res,403,'USER_NOT_FOUND');const data=user.data();let ids=[data.organizationId,data.primaryOrganizationId,data.activeOrganizationId,...(Array.isArray(data.organizations)?data.organizations:[])].filter(x=>typeof x==='string');const legacy=await db.collection('organization_members').where('uid','==',req.identity.uid).limit(50).get();ids.push(...legacy.docs.filter(x=>!inactive(x.data())).map(x=>x.data().organizationId).filter(Boolean));if(globalRoles.has(data.systemRole)){const all=await db.collection('organizations').limit(50).get();ids.push(...all.docs.map(x=>x.id))}ids=[...new Set(ids)];const docs=await Promise.all(ids.map(id=>db.doc(`organizations/${id}`).get()));res.json({user:{uid:req.identity.uid,displayName:data.displayName||req.identity.name||'',systemRole:data.systemRole||'user'},organizations:docs.filter(x=>x.exists&&!inactive(x.data())).map(x=>({id:x.id,name:x.data().name||x.id,slug:x.data().slug||''}))})}catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}});

app.get('/api/organizations/:orgId/nestlocal',authenticate,authorize,async(req,res)=>{
  try{const [settings,services,requests,customers]=await Promise.all([db.doc(`organizations/${req.access.orgId}/nestlocal_settings/public`).get(),db.collection(`organizations/${req.access.orgId}/nestlocal_services`).get(),db.collection(`organizations/${req.access.orgId}/nestlocal_requests`).orderBy('createdAt','desc').limit(100).get(),db.collection(`organizations/${req.access.orgId}/nestlocal_customers`).limit(100).get()]);res.json({organization:{id:req.access.orgId,name:req.access.org.name},settings:settings.exists?settings.data():null,services:services.docs.map(x=>({id:x.id,...x.data()})),requests:requests.docs.map(x=>({id:x.id,...x.data(),trackingTokenHash:undefined})),customerCount:customers.size})}catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}});

app.post('/api/organizations/:orgId/nestlocal/bootstrap',authenticate,authorize,async(req,res)=>{
  try{const enabled=Array.isArray(req.access.org.enabledApps)&&req.access.org.enabledApps.includes('nestlocal');if(!globalRoles.has(req.access.systemRole)&&!enabled)return sendError(res,403,'APP_NOT_ENABLED');const root=`organizations/${req.access.orgId}`;const settings=db.doc(`${root}/nestlocal_settings/public`);const existing=await settings.get();if(existing.exists)return res.json({created:false});const batch=db.batch();batch.create(settings,{businessName:req.access.org.name,slug:`${slug(req.access.org.slug||req.access.org.name)}-${req.access.orgId.slice(0,6)}`,coverageCodes:['londrina','cambe'],whatsapp:'',currency:'BRL',validForMinutes:30,catalogVersion:'draft-1',published:false,createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});for(const s of [{id:'higienizacao-split',name:'Higienização de split',mode:'fixed',unitPriceCents:15000,durationMinutes:60,maxQuantity:4,equipmentTypes:['split'],inclusions:'Higienização padrão do aparelho',exclusions:'Reparo, peças e acesso especial'},{id:'visita-tecnica',name:'Visita técnica',mode:'fixed',unitPriceCents:12000,durationMinutes:60,maxQuantity:1,equipmentTypes:['split'],inclusions:'Avaliação técnica no endereço',exclusions:'Peças e execução do reparo'},{id:'instalacao-reparo',name:'Instalação ou reparo',mode:'review'}])batch.create(db.doc(`${root}/nestlocal_services/${s.id}`),{...s,published:false});await batch.commit();res.status(201).json({created:true,warning:'REVIEW_PRICES_BEFORE_PUBLISH'})}catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}});

app.put('/api/organizations/:orgId/nestlocal/settings',authenticate,authorize,async(req,res)=>{
  const b=req.body||{};const data={businessName:clean(b.businessName).slice(0,100),slug:slug(b.slug),whatsapp:phone(b.whatsapp),coverageCodes:Array.isArray(b.coverageCodes)?[...new Set(b.coverageCodes.map(slug).filter(Boolean))].slice(0,30):[],validForMinutes:Number(b.validForMinutes||30),published:false,updatedAt:admin.firestore.FieldValue.serverTimestamp()};if(data.businessName.length<2||data.slug.length<3||!data.coverageCodes.length||!Number.isSafeInteger(data.validForMinutes)||data.validForMinutes<5||data.validForMinutes>1440)return sendError(res,400,'INVALID_SETTINGS');await db.doc(`organizations/${req.access.orgId}/nestlocal_settings/public`).set(data,{merge:true});res.json({ok:true})});

app.put('/api/organizations/:orgId/nestlocal/services/:serviceId',authenticate,authorize,async(req,res)=>{
  const b=req.body||{},id=slug(req.params.serviceId);if(!id||!clean(b.name)||!['fixed','review'].includes(b.mode))return sendError(res,400,'INVALID_SERVICE');const data={name:clean(b.name).slice(0,100),mode:b.mode,published:false};if(b.mode==='fixed')Object.assign(data,{unitPriceCents:Number(b.unitPriceCents),durationMinutes:Number(b.durationMinutes),maxQuantity:Number(b.maxQuantity),equipmentTypes:Array.isArray(b.equipmentTypes)?b.equipmentTypes.map(slug).filter(Boolean):[],inclusions:clean(b.inclusions).slice(0,500),exclusions:clean(b.exclusions).slice(0,500)});try{quote({catalog:{organizationId:req.access.orgId,version:'validation',status:'published',currency:'BRL',validForMinutes:30,coverageCodes:['validation'],services:[{id,...data}]},request:{serviceId:id,quantity:1,coverageCode:'validation',equipmentType:data.equipmentTypes?.[0],safeAccess:true},now:new Date()})}catch(e){if(data.mode==='fixed')return sendError(res,400,'INVALID_SERVICE')}await db.doc(`organizations/${req.access.orgId}/nestlocal_services/${id}`).set(data,{merge:true});await db.doc(`organizations/${req.access.orgId}/nestlocal_settings/public`).set({published:false,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});res.json({ok:true})});

app.post('/api/organizations/:orgId/nestlocal/publish',authenticate,authorize,async(req,res)=>{
  try{const settingsRef=db.doc(`organizations/${req.access.orgId}/nestlocal_settings/public`);const [settings,services]=await Promise.all([settingsRef.get(),db.collection(`organizations/${req.access.orgId}/nestlocal_services`).get()]);if(!settings.exists||services.empty)return sendError(res,409,'CATALOG_INCOMPLETE');const data=settings.data();const list=services.docs.map(x=>({id:x.id,...x.data()}));for(const s of list){if(s.mode==='fixed')quote({catalog:{organizationId:req.access.orgId,version:'validation',status:'published',currency:'BRL',validForMinutes:data.validForMinutes,coverageCodes:data.coverageCodes,services:[s]},request:{serviceId:s.id,quantity:1,coverageCode:data.coverageCodes[0],equipmentType:s.equipmentTypes[0],safeAccess:true},now:new Date()})}const version=`v${Date.now()}`,directoryRef=db.doc(`nestlocal_public_stores/${data.slug}`);await db.runTransaction(async tx=>{const directory=await tx.get(directoryRef);if(directory.exists&&directory.data()?.organizationId!==req.access.orgId)throw new TypeError('SLUG_TAKEN');if(data.publishedSlug&&data.publishedSlug!==data.slug)tx.delete(db.doc(`nestlocal_public_stores/${data.publishedSlug}`));tx.set(directoryRef,{organizationId:req.access.orgId,updatedAt:admin.firestore.FieldValue.serverTimestamp()});tx.set(settingsRef,{published:true,publishedSlug:data.slug,catalogVersion:version,publishedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true})});const batch=db.batch();for(const s of services.docs)batch.set(s.ref,{published:true,catalogVersion:version},{merge:true});await batch.commit();res.json({ok:true,version,publicPath:`/s/${data.slug}`})}catch(e){console.error(e);sendError(res,e?.message==='SLUG_TAKEN'?409:409,e?.message==='SLUG_TAKEN'?'SLUG_TAKEN':'CATALOG_INCOMPLETE')}});

app.get('/api/organizations/:orgId/nestlocal/requests/:requestId/photos/:photoIndex',authenticate,authorize,async(req,res)=>{try{const requestId=safeId(req.params.requestId),index=Number(req.params.photoIndex);if(!requestId||!Number.isSafeInteger(index)||index<0||index>4)return sendError(res,404,'NOT_FOUND');const doc=await db.doc(`organizations/${req.access.orgId}/nestlocal_requests/${requestId}`).get(),attachment=doc.data()?.attachments?.[index];if(!doc.exists||!attachment?.path||!attachment.path.startsWith(`organizations/${req.access.orgId}/nestlocal/requests/${requestId}/`))return sendError(res,404,'NOT_FOUND');res.set({'Content-Type':attachment.contentType,'Cache-Control':'private,no-store','Content-Disposition':`inline; filename="pedido-${requestId}-${index+1}"`});admin.storage().bucket().file(attachment.path).createReadStream().on('error',e=>{console.error(e);if(!res.headersSent)sendError(res,404,'NOT_FOUND');else res.destroy(e)}).pipe(res)}catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}});

app.patch('/api/organizations/:orgId/nestlocal/requests/:requestId',authenticate,authorize,async(req,res)=>{const status=clean(req.body?.status),requestId=safeId(req.params.requestId);if(!requestId||!['new','reviewing','quoted','scheduled','completed','cancelled'].includes(status))return sendError(res,400,'INVALID_STATUS');await db.doc(`organizations/${req.access.orgId}/nestlocal_requests/${requestId}`).update({status,updatedAt:admin.firestore.FieldValue.serverTimestamp()});res.json({ok:true})});

app.use((err,_req,res,_next)=>{console.error(err);sendError(res,err?.code==='LIMIT_FILE_SIZE'?413:400,err?.code==='LIMIT_FILE_SIZE'?'PHOTO_TOO_LARGE':'INVALID_UPLOAD')});
app.use((_req,res)=>sendError(res,404,'NOT_FOUND'));
const port=Number(process.env.PORT||8080);app.listen(port,()=>console.log(`NestLocal API listening on ${port}`));
