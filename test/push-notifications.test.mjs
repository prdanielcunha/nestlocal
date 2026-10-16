import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
const client=readFileSync(new URL('../web/push-notifications.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../web/nestlocal-push-sw.js',import.meta.url),'utf8');

test('C13: push defaults off without explicit administrator enablement and VAPID config',()=>{
 assert.match(server,/NESTLOCAL_PUSH_ENABLED==='true'/);
 assert.match(server,/NESTLOCAL_WEB_PUSH_VAPID_PUBLIC_KEY/);
 assert.match(server,/if\(!nestLocalPushEnabled\)return sendError\(res,503,'PUSH_NOT_CONFIGURED'\)/);
 assert.match(server,/requiresExplicitConsent:true/);
 assert.match(server,/scheduledRemindersEnabled:false/);
});
test('C13: push enrollment and revocation are tenant- and user-scoped',()=>{
 const a=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/push/devices'");
 const b=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/action-tasks'",a);
 const route=server.slice(a,b);
 assert.ok(a>0&&b>a);
 assert.match(route,/authenticate,authorize/);
 assert.match(route,/req\.access\.orgId/);
 assert.match(server,/const pushDeviceRef=\(orgId,tokenValue\)=>[\s\S]*?hash\(tokenValue\)/);
 assert.match(route,/existing\.data\(\)\?\.uid!==uid/);
 assert.match(route,/PUSH_DEVICE_ALREADY_BOUND/);
 assert.match(route,/snap\.data\(\)\?\.uid!==uid/);
 assert.match(route,/PUSH_DEVICE_ACCESS_DENIED/);
 assert.match(route,/gatewayVerified:false|delivered:false/);
 assert.match(route,/PUSH_DEVICE_EXPIRED/);
 assert.doesNotMatch(route,/res\.json\(\{token/);
});
test('C13: browser opt-in only and no raw token persisted in localStorage',()=>{
 assert.match(client,/Notification\.requestPermission\(\)/);
 assert.match(client,/serviceWorker\.register\('\/nestlocal-push-sw\.js'/);
 assert.match(client,/getToken\(sdk\.messaging/);
 assert.match(ui,/data-push-enable/);
 assert.match(ui,/data-push-disable/);
 assert.match(ui,/data-push-test/);
 assert.doesNotMatch(client,/localStorage\.setItem/);
 assert.doesNotMatch(client,/sessionStorage\.setItem/);
});
test('C13: notification worker ignores unrecognized payload and never shows customer PII',async()=>{
 const handlers={},shown=[];
 const self={
   location:{origin:'https://nestlocal.millionsnest.com'},
   registration:{showNotification:async(title,options)=>shown.push({title,...options})},
   clients:{matchAll:async()=>[],openWindow:async()=>{}},
   addEventListener:(name,callback)=>handlers[name]=callback,
 };
 vm.runInNewContext(worker,{self,URL});
 const send=async payload=>{
   let promise;
   handlers.push({data:{json:()=>payload},waitUntil:x=>promise=x});
   await promise;
 };
 await send({data:{kind:'unknown',title:'Customer secret',body:'PRIVATE'}});
 assert.equal(shown.length,0);
 await send({data:{kind:'test',locale:'pt',title:'Customer secret',body:'PRIVATE',phone:'1234567890'}});
 assert.equal(shown.length,1);
 assert.match(shown[0].title,/NestLocal/);
 assert.equal(shown[0].body.includes('PRIVATE'),false);
 assert.equal(shown[0].data.destination,'/?view=today');
});
