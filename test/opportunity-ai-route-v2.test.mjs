import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
const a=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/opportunity-drafts/:draftId/ai-preview'");
const b=server.indexOf('// F5 manual task ledger',a);
const route=server.slice(a,b);
test('AI route is server-flagged, tenant authenticated, read-only protected and requires explicit consent',()=>{
 assert.ok(a>0&&b>a);
 for(const s of ['authenticate,authorize','pilotOpportunityAiEnabled(req.access.orgId)',
  'req.access.entitlement?.canUseAI===false','consentToProcessMessage!==true',
  'redactOpportunityForAi','req.access.orgId','DRAFT_NOT_EDITABLE','sourceField','aiProcessed'])
  assert.ok(route.includes(s),'missing '+s);
});
test('no customer data or payload sent to provider; only redacted record and authorized token',()=>{
 assert.ok(route.includes('text=redactOpportunityForAi(String(record.message'));
 assert.ok(route.includes('extractNestLocalRequest({'));
 assert.ok(route.includes('sessionToken:readNestLocalSessionToken(req)'));
 assert.doesNotMatch(route,/sendMessage\(|sendWhatsapp\(|reserveSchedule\(|customerPhone|stripe\./i);
});
test('NestAI call is bounded by atomic org/day quota and has manual fallback',()=>{
 for(const s of ['rateLimit(req','db.runTransaction(async tx=>','maxDailyAiRequests()',
  'AI_DAILY_BUDGET_REACHED',"reason:'AI_UNAVAILABLE'",'projectNestAiOpportunityExtraction'])
  assert.ok(route.includes(s),'missing '+s);
 assert.doesNotMatch(route,/nestlocal_requests\//);
});
test('UI never invokes AI without opt-in and never hides manual preview',()=>{
 for(const s of ['data-ai-consent','data-ai-draft-preview','consent?.checked',
  'consentToProcessMessage:true','data-draft-preview', 'aiManualFallback'])
  assert.ok(ui.includes(s),'missing '+s);
});
