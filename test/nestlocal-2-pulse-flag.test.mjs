import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const live=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
test('Pulse rollout is server-controlled, OFF by default, with per-organization allowlist',()=>{
  const from=server.indexOf('function pulseFeatureEnabled('),to=server.indexOf('// Pulse feedback is tenant-scoped',from);
  const block=server.slice(from,to);
  assert.ok(block.includes("process.env.NESTLOCAL_PULSE_V2_ENABLED==='true'"));
  assert.ok(block.includes("process.env.NESTLOCAL_PULSE_V2_PILOT_ORGS||''"));
  assert.ok(block.includes('allowed.includes(orgId)'));
  assert.match(server,/features:\\{pulseV2:pulseFeatureEnabled\\(req\\.access\\.orgId\\)(?:,opportunityDrafts:opportunityDraftsEnabled\\(req\\.access\\.orgId\\))?\\}/);
  assert.ok(live.includes("S.data.features?.pulseV2===true?pulseTodayCard(actions):''"));
});
test('Pulse feedback endpoints reject requests before reading private data when feature disabled',()=>{
  const a=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/pulse/feedback'");
  const b=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/team/:uid'",a);
  const block=server.slice(a,b);
  assert.equal((block.match(/!pulseFeatureEnabled\(req\.access\.orgId\)/g)||[]).length,2);
  assert.ok(block.includes("'FEATURE_DISABLED'"));
});
