import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Today derives next-best-actions from operational facts', () => {
  const client = read('../web/live.js');
  for (const token of [
    'function nextBestActions',
    "r.status==='in_progress'",
    "r.status==='accepted'",
    "r.status==='scheduled'",
    "['new','reviewing'].includes(r.status)",
    "r.status==='quoted'",
    "r.status==='completed'",
    "c.nextServiceDate&&c.nextServiceDate<=today",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('action priorities are deterministic and sorted', () => {
  const client = read('../web/live.js');
  for (const token of [
    "type:'finish',priority:100",
    "type:'schedule',priority:96",
    "type:'execute',priority:92",
    "type:'review',priority:82",
    "type:'followup',priority:76",
    "type:'collect',priority:72",
    "type:'reactivate',priority:66",
    "sort((a,b)=>b.priority-a.priority",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('scheduled work needs a real due date before becoming an execute action', () => {
  const client = read('../web/live.js');
  assert.ok(client.includes("r.status==='scheduled'&&(r.schedule?.date||r.preference?.date)&&"));
});

test('Today renders the action engine and keeps WhatsApp manual', () => {
  const client = read('../web/live.js');
  for (const token of [
    'actionEngineTitle',
    'function actionRow',
    "data-open-request=\"${esc(a.requestId||\'\')}\"",
    'reactivationMessage',
    'https://wa.me/',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('next-best-action styling exists', () => {
  const css = read('../web/operations.css');
  assert.ok(css.includes('.next-actions-card'));
  assert.ok(css.includes('.next-action'));
  assert.ok(css.includes('.action-priority'));
});
