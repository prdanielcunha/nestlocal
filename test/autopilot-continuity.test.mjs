import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../web/operations.css',import.meta.url),'utf8');

test('Autopilot deep link preserves origin context',()=>{
  assert.ok(client.includes("autopilotRequestId:''"));
  assert.ok(client.includes("S.page='requests';S.focusRequestId=id;S.autopilotRequestId=id;render()"));
  assert.ok(client.includes("const fromAutopilot=S.autopilotRequestId===r.id"));
});

test('focused request exposes explicit queue context and return action',()=>{
  for(const token of [
    "openedFromAutopilot:'Aberto pela Fila do Autopilot'",
    'data-return-autopilot="true"',
    "returnToAutopilotQueue()",
    "nextActionUpdated",
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('save and next reuses the lifecycle form instead of duplicating mutation logic',()=>{
  assert.ok(client.includes('data-save-next="true"'));
  assert.ok(client.includes("const goNext=e.submitter?.dataset.saveNext==='true'"));
  assert.ok(client.includes("if(goNext)returnToAutopilotQueue()"));
});

test('decisive status and schedule updates return to refreshed Today queue',()=>{
  assert.ok(client.includes("const fromAutopilot=S.autopilotRequestId===x.dataset.request"));
  assert.ok(client.includes("if(fromAutopilot)returnToAutopilotQueue();else render()"));
  assert.ok(client.includes("const fromAutopilot=S.autopilotRequestId===form.dataset.lifecycle"));
});

test('normal navigation clears Autopilot origin to avoid stale cross-context state',()=>{
  assert.ok(client.includes("S.focusRequestId='';S.autopilotRequestId='';S.page=x.dataset.nav"));
  assert.ok(client.includes("S.focusRequestId='';S.autopilotRequestId='';S.orgId=e.target.value"));
});

test('Autopilot continuity context is responsive',()=>{
  assert.ok(css.includes('.autopilot-context'));
  assert.ok(css.includes('@media(max-width:560px)'));
});
