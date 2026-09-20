import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('backend validates a small explicit action outcome vocabulary',()=>{
  const server=read('../server.mjs');
  for(const token of [
    "const assistanceOutcomes=new Set(['unresolved','no_response','asked_later','positive_signal','not_interested'])",
    "outcome=clean(b.outcome||'unresolved').toLowerCase()",
    "'INVALID_ACTION_OUTCOME'",
    "outcomeNote=clean(b.outcomeNote).slice(0,180)",
  ]) assert.ok(server.includes(token),'missing '+token);
});

test('human outcome stays separate from assisted-revenue contact fact',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/action-events'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/messages/prepare'",start);
  const block=server.slice(start,end);
  assert.ok(block.includes("lastAssistance:{id:eventId,actionType,channel,at,by:req.identity.uid}"));
  assert.ok(block.includes("lastAssistanceOutcome"));
  assert.equal(block.includes("status:'accepted'"),false);
  assert.equal(block.includes("status:'declined'"),false);
});

test('same-day idempotent event can refine outcome without duplicating contact',()=>{
  const server=read('../server.mjs');
  assert.ok(server.includes("tx.set(eventRef,{outcome,outcomeNote,snoozeDays,resumeOn,resurfaceMode,nextEligibleDate,metricsRecorded:true,cohortMetricsRecorded:true,...experimentFields,outcomeUpdatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true})"));
  assert.ok(server.includes("tx.set(targetRef,{assistanceCooldowns,lastAssistanceOutcome},{merge:true})"));
  assert.ok(server.includes("idempotent:true"));
});

test('Action Assistant captures outcome, optional note and independent resurface date',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "contactOutcome:'Resultado do contato'",
    'id="action-outcome"',
    'value="no_response"',
    'value="asked_later"',
    'value="positive_signal"',
    'value="not_interested"',
    'id="action-outcome-note"',
    "outcome=document.querySelector('#action-outcome')?.value||'unresolved'",
    "outcomeNote=document.querySelector('#action-outcome-note')?.value||''",
    "outcome,outcomeNote,snoozeDays",
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('resurfaced actions carry the previous human outcome as context',()=>{
  const client=read('../web/live.js');
  assert.ok(client.includes("lastOutcome:r.lastAssistanceOutcome?.outcome||''"));
  assert.ok(client.includes("lastOutcome:c.lastAssistanceOutcome?.outcome||''"));
  assert.ok(client.includes("previousOutcome:'Último resultado'"));
  assert.ok(client.includes('assist-previous-outcome'));
});

test('outcome controls are responsive',()=>{
  const css=read('../web/operations.css');
  assert.ok(css.includes('.assist-outcome'));
  assert.ok(css.includes('.assist-previous-outcome'));
  assert.ok(css.includes('@media(max-width:520px){.assist-outcome{grid-template-columns:1fr}}'));
});
