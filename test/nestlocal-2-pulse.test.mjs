import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPulseSnapshot,renderPulse} from '../web/pulse.js';

const NOW=Date.parse('2026-10-08T12:00:00Z'),YESTERDAY=NOW-60*3600000,RECENT=NOW-2*3600000;
const req=(id,status,updatedAt=YESTERDAY)=>({id,status,updatedAt:{seconds:Math.floor(updatedAt/1000)},customer:{name:'Test Customer'},quote:{totalCents:45000}});
const base=(x={})=>buildPulseSnapshot({now:NOW,today:'2026-10-08',requests:[],customers:[],actions:[],...x});
test('Pulse never fabricates cards without source records',()=>{
  const x=base({actions:[{type:'followup',requestId:'ghost',priority:76}],requests:[]});
  assert.equal(x.cards.length,0);
  assert.equal(x.total,0);
});
test('Pulse explains a 48h quote using the exact source ref and observation time',()=>{
  const r=req('quote_a','quoted');
  const x=base({requests:[r],actions:[{type:'followup',requestId:'quote_a',priority:76,customerName:'Fictitious'}]});
  assert.equal(x.cards.length,1);
  assert.deepEqual(x.cards[0].sourceRefs,[{kind:'request',id:'quote_a'}]);
  assert.equal(x.cards[0].facts.status,'quoted');
  assert.equal(x.cards[0].facts.ageHours,60);
  assert.equal(x.cards[0].generatedAt,'2026-10-08T12:00:00.000Z');
});
test('Undated or recent quote never appears merely because an action claims eligibility',()=>{
  for(const r of [{id:'q1',status:'quoted'},req('q1','quoted',RECENT)]){
    assert.equal(base({requests:[r],actions:[{type:'followup',requestId:'q1',priority:76}]}).cards.length,0);
  }
});
test('Receivable is actual nonnegative balance and cannot imply future revenue',()=>{
  const r={...req('payment_a','completed'),commercial:{paymentStatus:'partial',finalAmountCents:45000,amountPaidCents:15000}};
  const x=base({requests:[r],actions:[{type:'collect',requestId:r.id,priority:72}]});
  assert.equal(x.cards[0].facts.balanceCents,30000);
  assert.equal(x.cards[0].facts.status,'completed');
  assert.equal(base({requests:[{...r,commercial:{...r.commercial,amountPaidCents:45000}}],actions:[{type:'collect',requestId:r.id}]}).cards.length,0);
});
test('Dismiss and snooze suppress cards without mutating the source',()=>{
  const r=req('follow_a','quoted');
  const actions=[{type:'followup',requestId:r.id,priority:76}];
  const feedback=[{actionId:'followup:follow_a',outcome:'snooze',until:'2026-10-09'}];
  assert.equal(base({requests:[r],actions,feedback}).cards.length,0);
  assert.equal(base({requests:[r],actions,feedback:[{actionId:'followup:follow_a',outcome:'dismiss'}]}).cards.length,0);
  assert.equal(base({requests:[r],actions,feedback:[{actionId:'followup:follow_a',outcome:'snooze',until:'2026-10-08'}]}).cards.length,1);
  assert.equal(r.status,'quoted');
});
test('Recurrence only shown with a recorded due date; priority is deterministic',()=>{
  const customer={id:'customer_a',name:'Example',nextServiceDate:'2026-10-07'};
  const request=req('q2','quoted');
  const x=base({requests:[request],customers:[customer],actions:[{type:'reactivate',customerId:customer.id,priority:66},{type:'followup',requestId:'q2',priority:76}]});
  assert.deepEqual(x.cards.map(a=>a.type),['followup','reactivate']);
  assert.equal(base({customers:[{...customer,nextServiceDate:'2026-12-12'}],actions:[{type:'reactivate',customerId:customer.id,priority:66}]}).cards.length,0);
});
test('Pulse UI has safe inspect actions, auditable feedback, and useful empty state',()=>{
  const t=x=>x,esc=x=>String(x).replaceAll('"','&quot;'),money=x=>String(x);
  const html=renderPulse({snapshot:base(),t,esc,money});
  assert.ok(html.includes('pulseEmpty'));
  const example=renderPulse({snapshot:base({requests:[req('q3','quoted')],actions:[{type:'followup',requestId:'q3',priority:76}]}),t,esc,money});
  for(const tag of ['data-open-request','data-pulse-feedback="snooze"','data-pulse-feedback="dismiss"','pulseWhy'])assert.ok(example.includes(tag));
  assert.ok(!example.includes('wa.me/'));
});
test('Pulse feedback backend is scoped to authenticated organization and has immutable audit log',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const a=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/pulse/feedback'");
  const b=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/team/:uid'",a);
  const api=server.slice(a,b);
  for(const s of ['authenticate,authorize','req.access.orgId','PULSE_SOURCE_NOT_FOUND','PULSE_SOURCE_CHANGED','nestlocal_pulse_feedback_events','batch.create(eventRef','dismiss','snooze'])assert.ok(api.includes(s),'missing '+s);
  for(const forbidden of ['sendMessage(', 'createSchedule(', 'stripe.', 'modelId'])assert.equal(api.includes(forbidden),false);
});
