import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const client=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
test('email follow-up composes mailto without claiming send',()=>{
 const a=client.indexOf('function actionAssistantOverlay()'),b=client.indexOf('function ',a+20),slice=client.slice(a,b);
 for(const token of ['action.type===\'followup\'','mailto:','encodeURIComponent(playbook.message)','manualEmailButton','recordEmailButton','data-assistance-channel="email"','emailTexts.caution'])assert.ok(slice.includes(token),'missing '+token);
 assert.equal(slice.includes('window.location.assign('),false);
 assert.equal(slice.includes('fetch(mailto'),false);
});
test('server permits manual email only when customer email exists, and forbids unconsented marketing follow-up',()=>{
 const a=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/action-events'");
 const b=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/",a+25);
 const route=server.slice(a,b);
 for(const token of ['assistanceChannels.has(channel)','targetEmail=clean(requestId?data.customer?.email:data.email)',"channel==='email'&&!validContactEmail(targetEmail)","channel==='email'&&actionType==='customer_reactivation'","maintenanceEmail?.accepted!==true"])assert.ok(route.includes(token),'missing '+token);
 assert.ok(!route.includes('sendEmail('));
});
test('manual email action does not convert opening the link into recorded outreach',()=>{
 const click=client.indexOf("document.querySelectorAll('[data-assistance]')");
 const overlay=client.slice(client.indexOf('const manualEmailButton='),client.indexOf('const whatsappButton=',client.indexOf('const manualEmailButton=')));
 assert.ok(overlay.includes('href="')&&overlay.includes('data-assistance-channel="email"'));
 assert.ok(client.slice(click,click+1200).includes('button.onclick=async'));
});
