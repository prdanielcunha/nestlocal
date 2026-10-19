import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import {pushEndpoint,pushSubscription,nativePushConfiguration} from '../src/domain/native-push.mjs';
test('native push config defaults off and requires matching cryptographic keys',()=>{
 const keys=webpush.generateVAPIDKeys(),env={NESTLOCAL_NATIVE_PUSH_ENABLED:'true',NESTLOCAL_NATIVE_PUSH_PRIVATE_KEY:keys.privateKey,NESTLOCAL_NATIVE_PUSH_PUBLIC_KEY:keys.publicKey};
 assert.equal(nativePushConfiguration({}),null);assert.equal(nativePushConfiguration({...env,NESTLOCAL_NATIVE_PUSH_ENABLED:'false'}),null);
 assert.equal(nativePushConfiguration(env).publicKey,keys.publicKey);assert.equal(nativePushConfiguration({...env,NESTLOCAL_NATIVE_PUSH_PRIVATE_KEY:webpush.generateVAPIDKeys().privateKey}),null);
});
test('subscriptions reject SSRF, deceptive hostnames, malformed and invalid curve keys',()=>{
 for(const endpoint of ['http://fcm.googleapis.com/send/x','https://localhost/x','https://fcm.googleapis.com.attacker.test/x','https://user@fcm.googleapis.com/x','https://fcm.googleapis.com:444/x','https://127.0.0.1/x','https://fcm.googleapis.com/x#fragment'])assert.throws(()=>pushEndpoint(endpoint));
 const curve=createECDH('prime256v1');curve.generateKeys();const valid={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',keys:{p256dh:curve.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
 assert.deepEqual(pushSubscription(valid),valid);assert.throws(()=>pushSubscription({...valid,keys:{...valid.keys,p256dh:Buffer.alloc(65).toString('base64url')}}));
 assert.throws(()=>pushSubscription({...valid,keys:{...valid.keys,auth:'bad'}}));
});
test('real Web Push library encrypts generic data and authenticates with VAPID without contacting provider',()=>{
 const curve=createECDH('prime256v1');curve.generateKeys();const keys=webpush.generateVAPIDKeys(),payload=JSON.stringify({kind:'new_request',locale:'pt'});
 const request=webpush.generateRequestDetails({endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',keys:{p256dh:curve.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}},payload,{vapidDetails:{subject:'https://nestlocal.millionsnest.com',...keys},TTL:300});
 assert.equal(request.method,'POST');assert.equal(request.headers['Content-Encoding'],'aes128gcm');assert.ok(!request.body.includes(Buffer.from(payload)));assert.match(request.headers.Authorization,/vapid/);
});
