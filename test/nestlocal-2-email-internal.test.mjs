import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8'),client=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
test('authenticated operator can create internal request using email without WhatsApp',()=>{
 const a=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests',authenticate,authorize");
 const b=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/quote'",a);
 const route=server.slice(a,b);
 assert.ok(a>=0&&b>a);
 for(const x of ['authenticate,authorize','customerEmail=clean(b.email)','validContactEmail(customerEmail)',"hash(customerPhone||'email:'+customerEmail)",'customer:{name,phone:customerPhone,email:customerEmail}','tx.create(requestRef,record)'])assert.ok(route.includes(x),'missing '+x);
 assert.equal(route.includes('customerPhone.length<10||!serviceId'),false);
});
test('internal intake supports email or phone but requires at least one reply channel',()=>{
 const a=client.indexOf('function newRequestForm()'),b=client.indexOf('function emptyAction(',a),form=client.slice(a,b);
 assert.ok(form.includes('name="email" type="email"'));
 assert.ok(form.includes('name="phone" inputmode="tel"'));
 assert.ok(!form.includes('name="phone" required'));
 const handler=client.slice(client.indexOf("document.querySelector('#internal-request')"),client.indexOf("document.querySelectorAll('[data-request-quote]')"));
 assert.ok(handler.includes("email:f.get('email')"));
 assert.ok(handler.includes("!String(payload.phone||'').trim()&&!String(payload.email||'').trim()"));
});
test('existing phone customer hashing continues unchanged across public and internal intake',()=>{
 assert.ok(server.includes("hash(customerPhone||'email:'+customerEmail).slice(0,28)"));
 assert.ok(server.includes("hash(customerPhone||'email:'+customerEmail).slice(0,28),customerRef"));
});
