import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseOperationalFocus} from '../web/operational-focus.js';

const settings={published:true,slug:'minha-loja'};
const services=[{id:'a',name:'Serviço'}];
const requests=[{id:'r',status:'quoted'}];
test('readonly mode never offers a write action',()=>{
  assert.deepEqual(chooseOperationalFocus({readOnly:true,settings,services,requests,actions:[{requestId:'r'}]}),{kind:'readonly'});
});
test('setup and catalog are explicit steps before publishing',()=>{
  assert.equal(chooseOperationalFocus({}).kind,'setup');
  assert.equal(chooseOperationalFocus({settings}).kind,'catalog');
  assert.equal(chooseOperationalFocus({settings:{published:false},services}).kind,'publish');
});
test('real customer actions take precedence over marketing',()=>{
  const action={type:'schedule',requestId:'r',customerName:'Pessoa'};
  assert.deepEqual(chooseOperationalFocus({settings:{published:false},services,requests,actions:[action]}),{kind:'priority',action});
  assert.equal(chooseOperationalFocus({settings,services,requests,actions:[{type:'unknown'}]}).kind,'healthy');
});
test('open commercial drafts are actionable',()=>{
  assert.equal(chooseOperationalFocus({settings,services,drafts:[{state:'open',id:'x'}]}).kind,'draft');
  assert.equal(chooseOperationalFocus({settings,services,drafts:[{state:'archived',id:'x'}]}).kind,'share');
});
test('share only when business page is published and no requests exist',()=>{
  assert.equal(chooseOperationalFocus({settings,services}).kind,'share');
  assert.equal(chooseOperationalFocus({settings,services,requests}).kind,'healthy');
});
test('mobile menu has accessible extras and existing navigation target handlers',()=>{
  const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
  assert.match(ui,/mobileNav\(\)/);
  assert.match(ui,/class="mobile-more/);
  assert.match(ui,/data-open-request=/);
  assert.match(ui,/data-action-page=/);
  assert.match(ui,/function operationalFocus\(/);
  assert.match(ui,/data-nav/);
});

test('pricing UI delegates current offers to checkout instead of obsolete constants',()=>{
  const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
  assert.match(ui,/checkPlanPrice/);
  assert.doesNotMatch(ui,/plans=\[\['essential',79\]/);
  assert.match(ui,/nestlocal_\$\{id\}_monthly/);
});

test('v2 never passes raw actions without explanations to sales feed',()=>{
  const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
  assert.match(ui,/prioritized=buildFocusQueue\(nextBestActions\(\),organizationDateIso\(\)\)/);
  assert.doesNotMatch(ui,/actions=nextBestActions\(\)\.slice\(0,3\)/);
});
