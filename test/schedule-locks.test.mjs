import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('scheduled work requires an active assignee and atomic slot', () => {
  const server = read('../server.mjs');
  for (const token of [
    "const scheduleSlotStatuses=new Set(['scheduled','in_progress'])",
    'const scheduleSlotId=',
    'SCHEDULE_REQUIRED',
    'INVALID_ASSIGNEE',
    'SCHEDULE_CONFLICT',
    'nestlocal_schedule_slots',
    "status:'reserved'",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('schedule transaction reads slot state before writing it', () => {
  const server = read('../server.mjs');
  const start = server.indexOf("const nextStatus=clean(b.status||current.status)");
  const end = server.indexOf("tx.update(ref,update)", start);
  assert.ok(start >= 0 && end > start);
  const block = server.slice(start, end);
  assert.ok(block.indexOf("await Promise.all([") < block.indexOf("tx.set(slotRef"));
  assert.ok(block.includes("oldSlotRef?tx.get(oldSlotRef)"));
  assert.ok(block.includes("customerRef?tx.get(customerRef)"));
});

test('leaving the reserved lifecycle releases the previous slot', () => {
  const server = read('../server.mjs');
  assert.ok(server.includes("tx.delete(oldSlotRef)"));
  assert.ok(server.includes("admin.firestore.FieldValue.delete()"));
});

test('client schedules against real enabled team members', () => {
  const client = read('../web/live.js');
  for (const token of [
    "(S.data.team||[]).filter(m=>m.nestlocalEnabled)",
    'data-confirm-schedule=',
    "status:'scheduled'",
    'scheduleConflict',
    'chooseAssignee',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});
