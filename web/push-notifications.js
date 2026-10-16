// Explicit user opt-in only. Firebase public configuration is fetched from
// Hosting; no service key, bearer or FCM token is persisted by this module.
const FIREBASE_VERSION='12.3.0';
let currentToken='';
let contextPromise=null;
async function context(){
  if(contextPromise)return contextPromise;
  contextPromise=(async()=>{
    if(!('serviceWorker' in navigator)||!('Notification' in window)||!window.isSecureContext)
      throw new Error('PUSH_UNSUPPORTED');
    const result=await fetch('/__/firebase/init.json',{credentials:'same-origin',cache:'no-store'});
    if(!result.ok)throw new Error('PUSH_FIREBASE_CONFIGURATION_UNAVAILABLE');
    const config=await result.json();
    if(config?.projectId!=='millionsnest'||typeof config.apiKey!=='string'||
      !config.apiKey.startsWith('AIza'))throw new Error('PUSH_FIREBASE_CONFIGURATION_UNAVAILABLE');
    const [{initializeApp,getApps,getApp},messaging]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging.js`)
    ]);
    if(!(await messaging.isSupported()))throw new Error('PUSH_UNSUPPORTED');
    const app=getApps().length?getApp():initializeApp({...config,authDomain:'millionsnest.firebaseapp.com'});
    return {messaging:messaging.getMessaging(app),getToken:messaging.getToken};
  })().catch(error=>{contextPromise=null;throw error});
  return contextPromise;
}
async function deviceToken(vapidPublicKey){
  if(!/^[A-Za-z0-9_-]{50,200}$/.test(vapidPublicKey||''))throw new Error('PUSH_NOT_CONFIGURED');
  const sdk=await context();
  const registration=await navigator.serviceWorker.register('/nestlocal-push-sw.js',{scope:'/'});
  const token=await sdk.getToken(sdk.messaging,{vapidKey:vapidPublicKey,serviceWorkerRegistration:registration});
  if(!token)throw new Error('PUSH_TOKEN_UNAVAILABLE');
  currentToken=token;
  return token;
}
export async function enrollNestLocalPush({orgId,locale,vapidPublicKey,api}){
  if(Notification.permission!=='granted'){
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error('PUSH_PERMISSION_DENIED');
  }
  const token=await deviceToken(vapidPublicKey);
  try{
    await api(`/api/organizations/${encodeURIComponent(orgId)}/nestlocal/push/devices`,
      {method:'POST',body:JSON.stringify({token,locale})});
    return {token,registered:true};
  }catch(error){currentToken='';throw error}
}
export async function disableNestLocalPush({orgId,vapidPublicKey,api}){
  const token=currentToken||await deviceToken(vapidPublicKey);
  await api(`/api/organizations/${encodeURIComponent(orgId)}/nestlocal/push/devices`,
    {method:'DELETE',body:JSON.stringify({token})});
  currentToken='';
  return {registered:false};
}
export async function testNestLocalPush({orgId,vapidPublicKey,api}){
  const token=currentToken||await deviceToken(vapidPublicKey);
  return api(`/api/organizations/${encodeURIComponent(orgId)}/nestlocal/push/test`,
    {method:'POST',body:JSON.stringify({token})});
}
