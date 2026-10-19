import test from 'node:test';
import assert from 'node:assert/strict';
import {disableNativePush,releaseNativePush} from '../web/native-push.js';
test('logout stops device delivery even offline, while tenant opt-out preserves other bindings',async()=>{
 const previous=Object.fromEntries(['navigator','window','isSecureContext'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const calls=[],subscription={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',unsubscribe:async()=>{calls.push('unsubscribe');return true}};
 const worker={pushManager:{getSubscription:async()=>subscription}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{getRegistration:async()=>worker}}});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{PushManager:class{},Notification:class{}}});
 Object.defineProperty(globalThis,'isSecureContext',{configurable:true,value:true});
 try{
  const api=async(path,options)=>{calls.push({path,...options});throw Error('offline')};
  await releaseNativePush({orgId:'org-a',api});assert.equal(calls[0],'unsubscribe');assert.equal(calls[1].method,'DELETE');assert.equal(calls[1].timeoutMs,3000);assert.equal(JSON.parse(calls[1].body).endpoint,subscription.endpoint);
  calls.length=0;await disableNativePush({orgId:'org-b',api:async(path,options)=>calls.push({path,...options})});assert.equal(calls.length,1);assert.match(calls[0].path,/org-b/);assert.notEqual(calls[0],'unsubscribe');
  calls.length=0;worker.pushManager.getSubscription=async()=>null;await releaseNativePush({orgId:'org-a',api});assert.equal(calls.length,0);
 }finally{for(const [key,descriptor]of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}
});
