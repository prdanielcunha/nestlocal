// The browser stores the subscription in PushManager, never application storage.
let scope='';
async function registration(create=false){
 if(!globalThis.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('PUSH_UNSUPPORTED');
 return create?navigator.serviceWorker.register('/nestlocal-push-sw.js',{scope:'/'}):navigator.serviceWorker.getRegistration('/nestlocal-push-sw.js');
}
const publicBytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export async function enrollNativePush({orgId,locale,vapidPublicKey,api}){
 if(typeof Notification==='undefined')throw Error('PUSH_UNSUPPORTED');
 if(Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted')throw Error('PUSH_PERMISSION_DENIED');
 const worker=await registration(true);await navigator.serviceWorker.ready;
 let subscription=await worker.pushManager.getSubscription();
 const expected=publicBytes(vapidPublicKey),actual=subscription?.options?.applicationServerKey;
 if(subscription&&actual&&Array.from(new Uint8Array(actual)).join(',')!==Array.from(expected).join(','))throw Error('PUSH_KEY_CHANGED');
 subscription??=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:expected});
 await api(`/api/organizations/${encodeURIComponent(orgId)}/nestlocal/push/devices`,{method:'POST',body:JSON.stringify({transport:'web_push',subscription:subscription.toJSON(),locale})});scope=orgId;
 return {registered:true};
}
async function existing(){const worker=await registration();return worker?.pushManager.getSubscription()}
export async function disableNativePush({orgId,api}){
 const subscription=await existing();if(!subscription)return {registered:false};
 await api(`/api/organizations/${encodeURIComponent(orgId)}/nestlocal/push/devices`,{method:'DELETE',body:JSON.stringify({transport:'web_push',endpoint:subscription.endpoint})});
 // One browser subscription can serve another authorized organization. Revoke
 // this tenant binding only; unsubscribing would silently break the others.
 if(scope===orgId)scope='';return {registered:false};
}
export async function testNativePush({orgId,api}){
 const subscription=await existing();if(!subscription)throw Error('PUSH_NOT_REGISTERED');
 return api(`/api/organizations/${encodeURIComponent(orgId)}/nestlocal/push/test`,{method:'POST',body:JSON.stringify({transport:'web_push',endpoint:subscription.endpoint})});
}
