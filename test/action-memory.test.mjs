import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { actionCooldownAllows } from '../web/action-focus.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('cooldown blocks an assisted action until its explicit date',()=>{
  assert.equal(actionCooldownAllows({assistanceCooldowns:{quote_followup:'2026-09-20'}},'quote_followup','2026-09-19'),false);
  assert.equal(actionCooldownAllows({assistanceCooldowns:{quote_followup:'2026-09-20'}},'quote_followup','2026-09-20'),true);
  assert.equal(actionCooldownAllows({assistanceCooldowns:{}},'quote_followup','2026-09-19'),true);
});

test('invalid cooldown data fails open instead of hiding work forever',()=>{
  assert.equal(actionCooldownAllows({assistanceCooldowns:{quote_followup:'invalid'}},'quote_followup','2026-09-19'),true);
  assert.equal(actionCooldownAllows({assistanceCooldowns:{quote_followup:'2026-09-20'}},'quote_followup','invalid'),true);
});

test('server validates quick cooldowns and persists the resolved eligibility date',()=>{
  const server=read('../server.mjs');
  for(const token of [
    "snoozeDays=Number(b.snoozeDays??1)",
    "snoozeDays<1||snoozeDays>30",
    "'INVALID_SNOOZE_DAYS'",
    "nextEligibleDate=resumeOn||addIsoDays(today,snoozeDays)",
    "assistanceCooldowns={...(data.assistanceCooldowns||{}),[actionType]:nextEligibleDate}",
    "snoozeDays,resumeOn,resurfaceMode,nextEligibleDate",
  ]) assert.ok(server.includes(token),'missing '+token);
});

test('idempotent action event can update resurface date without duplicating event',()=>{
  const server=read('../server.mjs');
  assert.ok(server.includes("if(existing.exists){"));
  assert.ok(server.includes("tx.set(targetRef,{assistanceCooldowns,lastAssistanceOutcome},{merge:true})"));
  assert.ok(server.includes("idempotent:true"));
});

test('assistance recording does not mutate generic request updatedAt',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/action-events'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/messages/prepare'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes("tx.set(targetRef,{assistanceCooldowns,lastAssistanceOutcome},{merge:true})"));
  assert.ok(block.includes("lastAssistance:{id:eventId,actionType,channel,at,by:req.identity.uid}"));
});

test('next best action engine respects persisted cooldowns for follow-up and reactivation',()=>{
  const client=read('../web/live.js');
  assert.ok(client.includes("actionCooldownAllows(r,'quote_followup',today)"));
  assert.ok(client.includes("actionCooldownAllows(c,'customer_reactivation',today)"));
});

test('Action Assistant exposes explicit resurface choices and sends the selection',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "remindAfterContact:'Depois de registrar'",
    'id="action-snooze-days"',
    "const defaultSnooze=action.type==='followup'?2:1",
    "snoozeValue=document.querySelector('#action-snooze-days')?.value||'1'",
    "snoozeDays=snoozeValue==='custom'?1:Number(snoozeValue)",
    "contactRecordedSnoozed",
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('action memory control is visually distinct',()=>{
  const css=read('../web/operations.css');
  assert.ok(css.includes('.assist-snooze'));
  assert.ok(css.includes('.assist-snooze select'));
});
