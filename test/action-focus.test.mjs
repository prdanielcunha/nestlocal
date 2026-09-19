import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildFocusQueue, decorateAction, daysBetweenIso } from '../web/action-focus.js';

test('ISO day difference is calendar-safe and never negative', () => {
  assert.equal(daysBetweenIso('2026-09-18','2026-09-19'),1);
  assert.equal(daysBetweenIso('2026-09-20','2026-09-19'),0);
  assert.equal(daysBetweenIso('invalid','2026-09-19'),0);
});

test('focus queue translates numeric priority into human urgency', () => {
  assert.equal(decorateAction({type:'finish',priority:100},'2026-09-19').urgency,'now');
  assert.equal(decorateAction({type:'followup',priority:76},'2026-09-19').urgency,'next');
  assert.equal(decorateAction({type:'reactivate',priority:66},'2026-09-19').urgency,'opportunity');
});

test('focus queue explains overdue execution with factual days', () => {
  const x=decorateAction({type:'execute',priority:92,dueDate:'2026-09-16'},'2026-09-19');
  assert.equal(x.reasonKey,'why_execute_overdue');
  assert.equal(x.reasonValue,3);
  assert.equal(x.overdueDays,3);
});

test('focus queue explains stale quote from captured age hours', () => {
  const x=decorateAction({type:'followup',priority:76,ageHours:63},'2026-09-19');
  assert.equal(x.reasonKey,'why_followup');
  assert.equal(x.reasonValue,63);
});

test('focus queue preserves deterministic order and limits secondary cognitive load', () => {
  const actions=Array.from({length:9},(_,i)=>({type:'review',priority:90-i,customerName:'C'+i}));
  const q=buildFocusQueue(actions,'2026-09-19');
  assert.equal(q.focus.customerName,'C0');
  assert.equal(q.next.length,5);
  assert.equal(q.remainingCount,3);
  assert.equal(q.total,9);
});

test('live UI uses Focus Queue and no longer exposes opaque numeric priority text', () => {
  const client=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../web/operations.css',import.meta.url),'utf8');

  for(const token of [
    "focusQueue:'Fila do Autopilot'",
    "focusQueue:'Autopilot Queue'",
    "focusQueue:'Cola del Autopilot'",
    "buildFocusQueue(actions,organizationDateIso())",
    "class=\"card focus-queue\"",
    "actionReason(a)",
    "urgencyLabel(a)",
    "ageHours:created?Math.floor",
  ]) assert.ok(client.includes(token), 'missing '+token);

  assert.equal(client.includes("${t('priority')} ${esc(a.priority)}"),false);
  assert.ok(css.includes('.focus-action'));
  assert.ok(css.includes('.why-card'));
  assert.ok(css.includes('@media(max-width:620px)'));
});
