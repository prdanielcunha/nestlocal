import test from 'node:test';
import assert from 'node:assert/strict';
import { extractNestLocalRequest, composeNestLocalQuote, composeNestLocalFollowup } from './nestai.mjs';

const validSession='nl_'+('a'.repeat(43));

async function withMockFetch(run){
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url,init={})=>{
    calls.push({url:String(url),init});
    if(String(url).includes('/api/v1/ai/nestlocal-session-token')){
      assert.equal(init.headers.authorization,'Bearer '+validSession);
      return new Response(JSON.stringify({token:'service-token',expiresIn:300}),{status:200,headers:{'content-type':'application/json'}});
    }
    const body=JSON.parse(String(init.body||'{}'));
    const task=body.task;
    const result=task==='nestlocal.request.extract'
      ? {intent:'quote',service:'cleaning',dimensions:null,preferredDate:null,preferredPeriod:null,missingFields:[]}
      : task==='nestlocal.quote.compose'
        ? 'Orçamento pronto para sua revisão.'
        : 'Olá! Passando para saber se ficou alguma dúvida sobre o orçamento.';
    return new Response(JSON.stringify({
      requestId:'req-1',task,version:1,result,
      meta:{providerClass:'free',cached:false,fallbackUsed:false,retries:0},
    }),{status:200,headers:{'content-type':'application/json'}});
  };
  try{return await run(calls)}finally{globalThis.fetch=original}
}

test('NestLocal extracts a request through canonical NestAI without mutating domain state',async()=>{
  await withMockFetch(async calls=>{
    const result=await extractNestLocalRequest({
      sessionToken:validSession,organizationId:'org-1',locale:'pt',
      text:'Preciso de limpeza do sofá amanhã à tarde',
    });
    assert.equal(result.intent,'quote');
    const aiCall=calls.find(call=>call.url==='https://ai.millionsnest.com/v1/run');
    assert.ok(aiCall);
    const body=JSON.parse(String(aiCall.init.body));
    assert.equal(body.task,'nestlocal.request.extract');
    assert.equal(body.context.organizationId,'org-1');
    assert.equal(body.input.authority.mutateRequest,false);
    assert.equal(aiCall.init.headers['x-millionsnest-app'],'nestlocal');
  });
});

test('quote composition receives authoritative total and cannot calculate or send',async()=>{
  await withMockFetch(async calls=>{
    const draft=await composeNestLocalQuote({
      sessionToken:validSession,organizationId:'org-1',locale:'pt',
      businessName:'Empresa',customerName:'Ana',service:'Limpeza',
      currency:'BRL',totalCents:25000,scope:{inclusions:'Mão de obra'},
    });
    assert.match(draft,/Orçamento/);
    const aiCall=calls.find(call=>String(call.init.body).includes('nestlocal.quote.compose'));
    const body=JSON.parse(String(aiCall.init.body));
    assert.equal(body.input.totalCents,25000);
    assert.equal(body.input.authority.calculatePrice,false);
    assert.equal(body.input.authority.sendMessage,false);
  });
});

test('follow-up composition remains a draft and never sends or changes status',async()=>{
  await withMockFetch(async calls=>{
    const draft=await composeNestLocalFollowup({
      sessionToken:validSession,organizationId:'org-1',locale:'pt',
      businessName:'Empresa',customerName:'Ana',service:'Limpeza',
      status:'quoted',totalCents:25000,ageHours:52,whatsappAllowed:true,
    });
    assert.match(draft,/orçamento/i);
    const aiCall=calls.find(call=>String(call.init.body).includes('nestlocal.followup.compose'));
    const body=JSON.parse(String(aiCall.init.body));
    assert.equal(body.input.authority.sendMessage,false);
    assert.equal(body.input.authority.changeStatus,false);
  });
});
