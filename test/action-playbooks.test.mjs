import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assistActionKey,
  buildActionPlaybook,
  officialMessageReadiness,
} from '../web/action-playbooks.js';

const money = cents => 'R$ ' + (Number(cents)/100).toFixed(2).replace('.',',');

test('follow-up playbook uses only known quote facts',()=>{
  const playbook=buildActionPlaybook({
    action:{
      type:'followup',
      customerName:'Ana Pereira',
      amount:125000,
      ageHours:63,
      whatsappAllowed:true,
      phone:'5543999999999',
    },
    lang:'pt',
    serviceLabel:'Higienização',
    formatMoney:money,
  });

  assert.match(playbook.message,/Ana/);
  assert.match(playbook.message,/Higienização/);
  assert.match(playbook.message,/R\$ 1250,00/);
  assert.equal(playbook.whatsappAllowed,true);
  assert.deepEqual(playbook.facts.map(x=>x.key),['fact_quote_wait','fact_quote_amount','fact_service']);
  assert.equal(playbook.facts[0].value,'63');
});

test('collection playbook never inherits WhatsApp authorization',()=>{
  const playbook=buildActionPlaybook({
    action:{
      type:'collect',
      customerName:'João',
      amount:8500,
      whatsappAllowed:true,
      phone:'5543988888888',
    },
    lang:'pt',
    formatMoney:money,
  });

  assert.match(playbook.message,/saldo pendente/);
  assert.match(playbook.message,/R\$ 85,00/);
  assert.equal(playbook.whatsappAllowed,false);
  assert.deepEqual(playbook.facts.map(x=>x.key),['fact_receivable']);
});

test('reactivation playbook carries the factual due date and service',()=>{
  const playbook=buildActionPlaybook({
    action:{
      type:'reactivate',
      customerName:'Maria Souza',
      dueDate:'2026-09-19',
      whatsappAllowed:true,
    },
    lang:'pt',
    serviceLabel:'Manutenção preventiva',
    formatMoney:money,
  });

  assert.match(playbook.message,/19\/09\/2026/);
  assert.match(playbook.message,/Manutenção preventiva/);
  assert.deepEqual(playbook.facts.map(x=>x.key),['fact_return_due','fact_service']);
});

test('official readiness mirrors consent template and provider gates',()=>{
  const action={type:'followup',whatsappAllowed:true};
  assert.deepEqual(
    officialMessageReadiness(action,{messaging:{connected:true,templates:{serviceUpdate:'quote_followup'}}}),
    {supported:true,ready:true,reason:'',templateName:'quote_followup'},
  );
  assert.equal(
    officialMessageReadiness({...action,whatsappAllowed:false},{messaging:{connected:true,templates:{serviceUpdate:'x'}}}).reason,
    'WHATSAPP_OPT_IN_REQUIRED',
  );
  assert.equal(
    officialMessageReadiness(action,{messaging:{connected:true,templates:{}}}).reason,
    'MESSAGE_TEMPLATE_REQUIRED',
  );
  assert.equal(
    officialMessageReadiness(action,{messaging:{connected:false,templates:{serviceUpdate:'x'}}}).reason,
    'MESSAGING_PROVIDER_NOT_CONNECTED',
  );
});

test('collection is unsupported by official WhatsApp preparation until purpose policy exists',()=>{
  const result=officialMessageReadiness(
    {type:'collect',whatsappAllowed:true},
    {messaging:{connected:true,templates:{serviceUpdate:'x'}}},
  );
  assert.equal(result.supported,false);
  assert.equal(result.ready,false);
  assert.equal(result.reason,'UNSUPPORTED');
});

test('assist action keys are deterministic by action target',()=>{
  assert.equal(assistActionKey({type:'followup',requestId:'req1'}),'followup:req1');
  assert.equal(assistActionKey({type:'reactivate',customerId:'cus1'}),'reactivate:cus1');
});

test('client integrates Action Assistant without automatic send',()=>{
  const client=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
  for(const token of [
    "from './action-playbooks.js'",
    "actionAssistant:'Assistente de ação'",
    'data-action-assist="',
    'function actionAssistantOverlay()',
    'data-copy-assist="true"',
    'data-prepare-official="',
    '/nestlocal/messages/prepare',
    "result.status==='ready'?t('messagePrepared')",
    'Nenhum envio foi feito.',
  ]) assert.ok(client.includes(token),'missing '+token);

  assert.equal(client.includes('data-auto-send'),false);
  assert.equal(client.includes('/messages/send'),false);
});

test('Action Assistant is responsive and visually distinguishes readiness',()=>{
  const css=readFileSync(new URL('../web/operations.css',import.meta.url),'utf8');
  for(const token of [
    '.assist-backdrop',
    '.action-assistant',
    '.assist-readiness>div.ready',
    '.assist-readiness>div.blocked',
    '@media(max-width:520px)',
  ]) assert.ok(css.includes(token),'missing '+token);
});
