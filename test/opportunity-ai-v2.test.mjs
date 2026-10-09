import test from 'node:test';
import assert from 'node:assert/strict';
import {redactOpportunityForAi,pilotOpportunityAiEnabled,maxDailyAiRequests,projectNestAiOpportunityExtraction} from '../src/domain/opportunity-ai.mjs';
const record={intent:'technical service',service:'limpeza do sofá',dimensions:null,preferredDate:null,
 preferredPeriod:null,missingFields:[]};
test('Pilot must be separately allowed by app, AI flag and tenant allowlist',()=>{
 const env={NESTLOCAL_AI_V2_ENABLED:'true',NESTLOCAL_OPPORTUNITY_AI_V2_ENABLED:'true',NESTLOCAL_OPPORTUNITY_AI_PILOT_ORGS:'pilot,another'};
 assert.equal(pilotOpportunityAiEnabled('pilot',env),true);
 assert.equal(pilotOpportunityAiEnabled('other',env),false);
 assert.equal(pilotOpportunityAiEnabled('pilot',{...env,NESTLOCAL_AI_V2_ENABLED:'false'}),false);
 assert.equal(maxDailyAiRequests({NESTLOCAL_OPPORTUNITY_AI_DAILY_CAP:'99999'}),25);
 assert.equal(maxDailyAiRequests({NESTLOCAL_OPPORTUNITY_AI_DAILY_CAP:'0'}),1);
});
test('Privacy firewall redacts email, URL, phones and identity codes before NestAI',()=>{
 const value=redactOpportunityForAi('Me chama 43 99999-9999 ou ana@example.com; veja https://example.com/test. CPF 123.456.789-10');
 for(const data of ['ana@example.com','99999-9999','https://example.com','123.456.789-10'])assert.equal(value.includes(data),false);
 assert.ok(value.includes('[email]'));assert.ok(value.includes('[url]'));
});
test('AI must cite service literally in operator source; never promote external guesses',()=>{
 const source=redactOpportunityForAi('Bom dia, preciso de limpeza do sofá amanhã.');
 const result=projectNestAiOpportunityExtraction(record,source);
 assert.equal(result.claims.length,1);assert.equal(result.claims[0].evidence,'limpeza do sofá');
 assert.equal(result.bookingConfirmed,false);assert.equal(result.delivery,false);
 const invented=projectNestAiOpportunityExtraction({...record,service:'reforma da cozinha'},source);
 assert.equal(invented.claims.length,0);
});
test('No silent date, period, price or dimension invention',()=>{
 const r=projectNestAiOpportunityExtraction({...record,preferredDate:'2026-10-22',
   preferredPeriod:'afternoon',dimensions:{width:25,height:99}},'Preciso de limpeza do sofá.');
 assert.equal(r.preferredDate,null);assert.equal(r.preferredPeriod,null);
 assert.equal('dimensions' in r,false);assert.equal('price' in r,false);
});
test('Malformed response degrades rather than mutating a request',()=>{
 assert.throws(()=>projectNestAiOpportunityExtraction({},'Texto'),/SCHEMA/);
 assert.throws(()=>projectNestAiOpportunityExtraction('invalid json','Texto'));
 assert.throws(()=>redactOpportunityForAi(' '),/AI_SOURCE_REQUIRED/);
 for(const language of ['pt','en','es'])assert.equal(projectNestAiOpportunityExtraction(record,'limpeza do sofá',language).questions.length,3);
});
