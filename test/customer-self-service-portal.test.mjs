import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('secure tracking projects only customer-safe schedule payment warranty and return facts',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.get('/api/public/requests/:requestId'");
  const end=server.indexOf("app.post('/api/public/requests/:requestId/decision'",start);
  const block=server.slice(start,end);
  assert.ok(start>=0);
  for(const token of [
    'trackingTokenValid',
    "scheduleVisible=['scheduled','in_progress','completed','no_show']",
    'customerConfirmation',
    'balanceCents',
    'pixVisible',
    'warranty:',
    'nextReturn:',
    "Cache-Control','private,no-store",
  ]) assert.ok(block.includes(token), `missing ${token}`);
  assert.equal(block.includes('assignedTo'),false);
  assert.equal(block.includes('execution.notes'),false);
});

test('customer schedule confirmation is token gated idempotent and only allowed while scheduled',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/public/requests/:requestId/schedule-confirmation'");
  const end=server.indexOf("app.get('/api/public/reviews/:requestId'",start);
  const block=server.slice(start,end);
  assert.ok(start>=0);
  for(const token of [
    "['confirmed','change_requested']",
    'trackingTokenValid',
    "current.status!=='scheduled'",
    "schedule.customerConfirmation",
    "source:'public_tracking'",
    'idempotent:true',
  ]) assert.ok(block.includes(token), `missing ${token}`);
});

test('Pix collection settings are manager controlled and never imply automatic settlement',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/payment-settings'");
  const end=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/capacity'",start);
  const block=server.slice(start,end);
  assert.ok(start>=0);
  for(const token of ['canManageNestLocal','PIX_KEY_REQUIRED','payments:{pix:{enabled,key,label,instructions}}']) assert.ok(block.includes(token), `missing ${token}`);
  assert.equal(block.includes('paymentStatus'),false);
  assert.equal(block.includes('amountPaid'),false);
});

test('client tracking portal handles schedule confirmation Pix warranty and return',()=>{
  const client=read('../web/live.js');
  for(const token of [
    'function trackingPortalView()',
    'data-schedule-confirm="confirmed"',
    'data-schedule-confirm="change_requested"',
    "t('balanceDue')",
    "t('copyPix')",
    "t('warranty')",
    "t('nextReturn')",
    "id=\"payment-settings\"",
    "payment-settings",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('customer requested schedule change becomes a high-priority factual action',()=>{
  const client=read('../web/live.js');
  const focus=read('../web/action-focus.js');
  assert.ok(client.includes("r.schedule?.customerConfirmation?.status==='change_requested'"));
  assert.ok(client.includes("type:'reschedule',priority:99"));
  assert.ok(focus.includes("case 'reschedule':"));
  assert.ok(focus.includes("reasonKey = 'why_reschedule'"));
});

test('customer portal surfaces are responsive',()=>{
  const css=read('../web/operations.css');
  for(const token of ['.payment-settings','.tracking-portal','.portal-money','.pix-box','@media(max-width:620px)']) assert.ok(css.includes(token), `missing ${token}`);
});
