import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
test('NestAI v2 global enable cannot silently enable Pulse, setup or return for other orgs',()=>{
 const helper=source.slice(source.indexOf('function pilotNestAiV2Enabled('),source.indexOf('// Setup/return are draft-only assists'));
 assert.ok(helper.includes('NESTLOCAL_AI_V2_PILOT_ORGS'));
 assert.ok(helper.includes('organizationId'));
 assert.equal(helper.includes("return true;"),false);
 for(const endpoint of ['setup-assist','return-suggest','pulse-explain']){
  const start=source.indexOf("/nestlocal/ai/"+endpoint+"'");
  assert.ok(start>=0);
  const sub=source.slice(start,start+2000);
  assert.ok(sub.includes("pilotNestAiV2Enabled(req.access.orgId)"),endpoint+' lacks tenant allowlist');
 }
});
test('F3 preview is separate from older AI assists',()=>{
 const p=source.slice(source.indexOf("app.post('/api/organizations/:orgId/nestlocal/opportunity-drafts/:draftId/ai-preview'"),source.indexOf('// F5 manual task ledger'));
 assert.ok(p.includes('pilotOpportunityAiEnabled(req.access.orgId)'));
 assert.doesNotMatch(p,/NESTLOCAL_AI_V2_PILOT_ORGS/);
});
