import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const adapter=readFileSync(new URL('../src/nestai.mjs',import.meta.url),'utf8');

test('F4 Pulse explanation requires canonical Hub auth + organization and no front-end model ID',()=>{
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/ai/pulse-explain'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/ai/request-extract'",start);
  const source=server.slice(start,end);
  assert.ok(start>=0&&end>start);
  for(const token of ['authenticate,authorize','req.access.orgId','PULSE_SOURCE_NOT_FOUND','NESTLOCAL_AI_V2_ENABLED','mode:\'manual\'','sourceIds:[id]'])assert.ok(source.includes(token),'missing '+token);
  assert.doesNotMatch(source,/admin\.auth\(\)\.createCustomToken|sendMessage\(|reserveSchedule\(|tx\.set\(|amountPaidCents[ ]*=/);
});

test('Only central SDK chooses providers and AI must echo exact source ID',()=>{
  const begin=adapter.indexOf('export async function explainNestLocalPulse');
  const code=adapter.slice(begin);
  for(const token of ['createNestLocalAiClient(input)','nestlocal.pulse.explain',"sourceIds:[sourceId]","mode:'suggestion_only'","sendMessage:false","reserveSchedule:false","mutateRequest:false","AI_UNGROUNDED_OUTPUT"])assert.ok(code.includes(token),'missing '+token);
  assert.equal(/modelId|apiKey|openai\.com\/v1|generativelanguage/.test(code),false);
});
