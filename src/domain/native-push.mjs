import webpush from 'web-push';
import {createECDH} from 'node:crypto';
export function pushEndpoint(value){
 if(typeof value!=='string'||value.length>2048)throw Error('INVALID_PUSH_DEVICE');
 let url;try{url=new URL(value)}catch{throw Error('INVALID_PUSH_DEVICE')}
 if(url.protocol!=='https:'||url.port||url.username||url.password||url.hash||!url.pathname||url.pathname==='/')throw Error('INVALID_PUSH_DEVICE');
 if(!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(url.hostname)&&!/^([a-z0-9-]+\.)?notify\.windows\.com$/.test(url.hostname))throw Error('INVALID_PUSH_DEVICE');
 return url.href;
}
function key(value,length){if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('INVALID_PUSH_DEVICE');const bytes=Buffer.from(value,'base64url');if(bytes.length!==length||bytes.toString('base64url')!==value)throw Error('INVALID_PUSH_DEVICE');return bytes}
export function pushSubscription(input){
 const endpoint=pushEndpoint(input?.endpoint),p256dh=key(input?.keys?.p256dh,65),auth=key(input?.keys?.auth,16);
 try{const validator=createECDH('prime256v1');validator.generateKeys();validator.computeSecret(p256dh)}catch{throw Error('INVALID_PUSH_DEVICE')}
 return {endpoint,keys:{p256dh:p256dh.toString('base64url'),auth:auth.toString('base64url')}};
}
export function nativePushConfiguration(env=process.env){
 if(env.NESTLOCAL_NATIVE_PUSH_ENABLED!=='true')return null;
 try{
  const privateKey=key(env.NESTLOCAL_NATIVE_PUSH_PRIVATE_KEY,32),publicKey=key(env.NESTLOCAL_NATIVE_PUSH_PUBLIC_KEY,65),pair=createECDH('prime256v1');pair.setPrivateKey(privateKey);
  if(!pair.getPublicKey().equals(publicKey))return null;
  return {subject:'https://nestlocal.millionsnest.com',publicKey:publicKey.toString('base64url'),privateKey:privateKey.toString('base64url')};
 }catch{return null}
}
export function registerNativePush(app,{db,admin,authenticate,authorize,hash,safeId,sendError,rateLimit,canNotify,env=process.env,send=webpush.sendNotification.bind(webpush)}){
 const configuration=nativePushConfiguration(env),base='/api/organizations/:orgId/nestlocal/push',refFor=(org,endpoint)=>db.doc(`organizations/${org}/nestlocal_web_push_devices/${hash(endpoint)}`);
 const fail=(res,error)=>{
  const code=error?.message;
  if(code==='INVALID_PUSH_DEVICE')return sendError(res,400,code);
  if(['PUSH_DEVICE_LIMIT','PUSH_DEVICE_ALREADY_BOUND'].includes(code))return sendError(res,409,code);
  if(code==='PUSH_DEVICE_ACCESS_DENIED')return sendError(res,403,code);
  return sendError(res,503,'PUSH_DEVICE_UNAVAILABLE');
 };
 app.post(base+'/devices',authenticate,authorize,async(req,res,next)=>{
  if(req.body?.transport!=='web_push')return next();if(!configuration)return sendError(res,503,'PUSH_NOT_CONFIGURED');
  try{
   const subscription=pushSubscription(req.body?.subscription),uid=safeId(req.identity.uid),locale=req.body?.locale;
   if(!uid||!['pt','en','es'].includes(locale))throw Error('INVALID_PUSH_DEVICE');
   if(!(await rateLimit(req,'native_push_enroll',req.access.orgId)))return sendError(res,429,'RATE_LIMITED');
   const ref=refFor(req.access.orgId,subscription.endpoint);
   await db.runTransaction(async tx=>{
    const [existing,owned]=await Promise.all([tx.get(ref),tx.get(db.collection(`organizations/${req.access.orgId}/nestlocal_web_push_devices`).where('uid','==',uid).limit(6))]);
    if(existing.exists&&existing.data().uid!==uid)throw Error('PUSH_DEVICE_ALREADY_BOUND');if(!existing.exists&&owned.size>=5)throw Error('PUSH_DEVICE_LIMIT');
    tx.set(ref,{uid,subscription,locale,enabled:true,channel:'web_push',updatedAt:admin.firestore.FieldValue.serverTimestamp()});
   });
   return res.set('Cache-Control','private,no-store').status(201).json({enabled:true,deviceId:ref.id,transport:'web_push'});
  }catch(error){return fail(res,error)}
 });
 app.delete(base+'/devices',authenticate,authorize,async(req,res,next)=>{
  if(req.body?.transport!=='web_push')return next();
  try{
   const endpoint=pushEndpoint(req.body?.endpoint),ref=refFor(req.access.orgId,endpoint);
   await db.runTransaction(async tx=>{const doc=await tx.get(ref);if(!doc.exists)return;if(doc.data().uid!==req.identity.uid)throw Error('PUSH_DEVICE_ACCESS_DENIED');tx.delete(ref)});
   return res.set('Cache-Control','private,no-store').json({enabled:false});
  }catch(error){return fail(res,error)}
 });
 const deliver=async(doc,kind)=>{
  const row=doc.data();if(row.enabled!==true)return false;
  const subscription=pushSubscription(row.subscription);
  try{await send(subscription,JSON.stringify({kind,locale:['pt','en','es'].includes(row.locale)?row.locale:'pt'}),{TTL:300,urgency:'normal',timeout:2500,vapidDetails:configuration});return true}
  catch(error){if([404,410].includes(error?.statusCode))await doc.ref.delete().catch(()=>{});return false}
 };
 app.post(base+'/test',authenticate,authorize,async(req,res,next)=>{
  if(req.body?.transport!=='web_push')return next();if(!configuration)return sendError(res,503,'PUSH_NOT_CONFIGURED');
  try{
   const endpoint=pushEndpoint(req.body?.endpoint),doc=await refFor(req.access.orgId,endpoint).get();
   if(!doc.exists||doc.data().uid!==req.identity.uid||doc.data().enabled!==true)throw Error('PUSH_DEVICE_ACCESS_DENIED');
   if(!(await rateLimit(req,'native_push_test',req.access.orgId)))return sendError(res,429,'RATE_LIMITED');
   const accepted=await deliver(doc,'test');if(!accepted)return sendError(res,503,'PUSH_TEST_UNAVAILABLE');
   return res.set('Cache-Control','private,no-store').json({providerAccepted:true,delivered:false,deliveryStatus:'unconfirmed',transport:'web_push'});
  }catch(error){return fail(res,error)}
 });
 return {
  publicConfiguration:configuration?{enabled:true,transport:'web_push',vapidPublicKey:configuration.publicKey,messagingAppId:null,messagingSenderId:null,deliveryGuarantee:false,requiresExplicitConsent:true,scheduledRemindersEnabled:false,eventNotificationsEnabled:true}:null,
  async notifyRequest(orgId,requestId){
   if(!configuration||!safeId(orgId)||!safeId(requestId))return;
   try{
    const receipt=db.doc(`organizations/${orgId}/nestlocal_web_push_events/${hash('new_request:'+requestId)}`);let claimed=false;
    await db.runTransaction(async tx=>{const previous=await tx.get(receipt);if(previous.exists)return;tx.create(receipt,{kind:'new_request',createdAt:admin.firestore.FieldValue.serverTimestamp()});claimed=true});if(!claimed)return;
    const devices=await db.collection(`organizations/${orgId}/nestlocal_web_push_devices`).where('enabled','==',true).limit(100).get(),actors=new Map();
    const results=await Promise.all(devices.docs.map(async doc=>{const uid=doc.data().uid;if(!actors.has(uid))actors.set(uid,canNotify(orgId,uid));if(!(await actors.get(uid)))return false;return deliver(doc,'new_request')}));
    await receipt.update({providerAcceptedCount:results.filter(Boolean).length,deliveryStatus:'unconfirmed'});
   }catch(error){console.error('NESTLOCAL_NATIVE_PUSH_EVENT_UNAVAILABLE',error?.code||error?.name)}
  }
 };
}
