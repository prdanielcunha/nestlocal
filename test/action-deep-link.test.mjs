import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../web/operations.css',import.meta.url),'utf8');

test('request cards expose stable internal deep-link identifiers',()=>{
  assert.ok(client.includes('data-request-card="${esc(r.id)}"'));
  assert.ok(client.includes("S.focusRequestId===r.id?'open':''"));
});

test('non-contact Autopilot actions target the exact request instead of generic Requests page',()=>{
  assert.ok(client.includes('data-open-request="${esc(a.requestId||\'\')}"'));
  assert.equal(client.includes('data-action-page="requests">${t(\'openRequests\')}'),false);
});

test('deep-link navigation opens and scrolls the target request',()=>{
  for(const token of [
    "querySelectorAll('[data-open-request]')",
    "S.page='requests';S.focusRequestId=id;render()",
    "target.open=true",
    "target.classList.add('focused-request')",
    "target.scrollIntoView({behavior:'smooth',block:'center'})",
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('normal navigation and organization switches clear stale request focus',()=>{
  assert.ok(client.includes("S.focusRequestId='';S.page=x.dataset.nav"));
  assert.ok(client.includes("S.focusRequestId='';S.orgId=e.target.value"));
});

test('focused request has a visible but temporary responsive-safe treatment',()=>{
  assert.ok(css.includes('.request{scroll-margin-top:96px}'));
  assert.ok(css.includes('.request.focused-request'));
  assert.ok(client.includes("setTimeout(()=>target.classList.remove('focused-request'),1800)"));
});
