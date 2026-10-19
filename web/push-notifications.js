// Explicit user opt-in only. Firebase public configuration is fetched from
// Hosting; no service key, bearer or FCM token is persisted by this module.
const FIREBASE_VERSION='12.3.0';
import {enrollNativePush,disableNativePush,testNativePush} from './native-push.js?v=20261019-v1';
let currentToken='';
let contextPromise=null;
async function context({messagingAppId,messagingSenderId}){
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
    if(!/^[A-Za-z0-9:]{10,150}$/.test(messagingAppId||'')||
      !/^\d{5,25}$/.test(messagingSenderId||''))throw new Error('PUSH_FIREBASE_CONFIGURATION_UNAVAILABLE');
    // Messaging requires appId + senderId, which some secondary Hosting sites
    // omit from init.json. A named app never interferes with Google Auth.
    const app=getApps().find(candidate=>candidate.name==='nestlocal-messaging')||
      initializeApp({...config,authDomain:'millionsnest.firebaseapp.com',
        appId:messagingAppId,messagingSenderId},'nestlocal-messaging');
    return {messaging:messaging.getMessaging(app),getToken:messaging.getToken};
  })().catch(error=>{contextPromise=null;throw error});
  return contextPromise;
}
async function deviceToken({vapidPublicKey,messagingAppId,messagingSenderId}){
  if(!/^[A-Za-z0-9_-]{50,200}$/.test(vapidPublicKey||''))throw new Error('PUSH_NOT_CONFIGURED');
  const sdk=await context({messagingAppId,messagingSenderId});
  const registration=await navigator.serviceWorker.register('/nestlocal-push-sw.js',{scope:'/'});
  const token=await sdk.getToken(sdk.messaging,{vapidKey:vapidPublicKey,serviceWorkerRegistration:registration});
  if(!token)throw new Error('PUSH_TOKEN_UNAVAILABLE');
  currentToken=token;
  return token;
}
export async function enrollNestLocalPush({orgId,locale,vapidPublicKey,messagingAppId,messagingSenderId,api}){
  if(!messagingAppId&&!messagingSenderId)return enrollNativePush({orgId,locale,vapidPublicKey,api});
  if(typeof Notification==='undefined')throw new Error('PUSH_UNSUPPORTED');
  if(Notification.permission!=='granted'){
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error('PUSH_PERMISSION_DENIED');
  }
  const token=await deviceToken({vapidPublicKey,messagingAppId,messagingSenderId});
  try{
    await api(`/api/organizations/${encodeURIComponent(orgId)}/nestlocal/push/devices`,
      {method:'POST',body:JSON.stringify({token,locale})});
    return {token,registered:true};
  }catch(error){currentToken='';throw error}
}
export async function disableNestLocalPush({orgId,vapidPublicKey,messagingAppId,messagingSenderId,api}){
  if(!messagingAppId&&!messagingSenderId)return disableNativePush({orgId,api});
  const token=currentToken||await deviceToken({vapidPublicKey,messagingAppId,messagingSenderId});
  await api(`/api/organizations/${encodeURIComponent(orgId)}/nestlocal/push/devices`,
    {method:'DELETE',body:JSON.stringify({token})});
  currentToken='';
  return {registered:false};
}
export async function testNestLocalPush({orgId,vapidPublicKey,messagingAppId,messagingSenderId,api}){
  if(!messagingAppId&&!messagingSenderId)return testNativePush({orgId,api});
  const token=currentToken||await deviceToken({vapidPublicKey,messagingAppId,messagingSenderId});
  return api(`/api/organizations/${encodeURIComponent(orgId)}/nestlocal/push/test`,
    {method:'POST',body:JSON.stringify({token})});
}
