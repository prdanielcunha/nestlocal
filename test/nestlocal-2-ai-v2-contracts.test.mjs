import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8'),ai=readFileSync(new URL('../src/nestai.mjs',import.meta.url),'utf8');
test('three v2 assists use only stable tasks on official SDK with no direct provider credentials',()=>{
  for(const x of ['nestlocal.pulse.explain','nestlocal.setup.assist','nestlocal.return.suggest'])assert.ok(ai.includes(x),'missing '+x);
  for(const x of ['createNestLocalAiClient(input)','authority:{mode:',"sendMessage:false","reserveSchedule:false"])assert.ok(ai.includes(x),'missing '+x);
  assert.doesNotMatch(ai,/modelId:|providerId:|openai\.com\/v1|generativelanguage\.googleapis/);
});
test('setup task is tenant-scoped and rejects non-admin changes',()=>{
  const a=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/ai/setup-assist'");
  const b=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/ai/return-suggest'",a);
  const route=server.slice(a,b);
  for(const x of ['authenticate,authorize','canManageNestLocal(req.access)','NESTLOCAL_AI_V2_ENABLED', 'assistNestLocalSetup','coverageCount','hasReplyChannel', "mode:'manual'"])assert.ok(route.includes(x),'missing '+x);
  assert.doesNotMatch(route,/tx\.set\(|\.update\(|\.create\(|sendMessage\(|changePrice\(/);
});
test('return suggestions require recorded purpose consent and source within authorized tenant',()=>{
  const a=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/ai/return-suggest'");
  const b=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/ai/pulse-explain'",a);
  const route=server.slice(a,b);
  for(const x of ['authenticate,authorize','req.access.orgId','PURPOSE_CONSENT_REQUIRED','maintenanceReminders?.accepted===true','maintenanceEmail?.accepted===true','NESTLOCAL_AI_V2_ENABLED','suggestNestLocalReturn',"send:false"])assert.ok(route.includes(x),'missing '+x);
  assert.doesNotMatch(route,/contactPhone|email:|phone:|password|tx\.update|sendMessage\(/);
});
test('provider failure and OFF flag never cause business mutation',()=>{
  const routes=server.slice(server.indexOf("app.post('/api/organizations/:orgId/nestlocal/ai/setup-assist'"),server.indexOf("app.post('/api/organizations/:orgId/nestlocal/ai/request-extract'"));
  assert.ok(routes.includes("SETUP_AI_DEGRADED"));
  assert.ok(routes.includes("RETURN_AI_DEGRADED"));
  assert.ok(routes.includes("PULSE_AI_DEGRADED"));
  assert.ok(routes.includes("NESTLOCAL_AI_V2_ENABLED!=='true'"));
  assert.doesNotMatch(routes,/tx\.create\(|tx\.update\(|tx\.set\(/);
});
