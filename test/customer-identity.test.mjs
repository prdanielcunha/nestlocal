import test from 'node:test';
import assert from 'node:assert/strict';
import {customerIdentityView,consolidatedCustomers} from '../src/domain/customer-identity.mjs';
import {renderCustomerMerge,customerOperationalSources} from '../web/customer-identity.js';
test('consolidated identity keeps primary contact consent, combines facts and leaves source records unchanged',()=>{
 const primary={id:'a',name:'Primary',phone:'111',lifetimeRevenueCents:100,nextServiceDate:'2027-05-01',messaging:{consents:{maintenanceReminders:{accepted:false}}}},
  other={id:'b',name:'Other',phone:'222',lifetimeRevenueCents:200,nextServiceDate:'2027-03-01',lastServiceDate:'2026-10-18',lastServiceLabel:'Actual service',messaging:{consents:{maintenanceReminders:{accepted:true}}}},before=structuredClone([primary,other]);
 const view=customerIdentityView(primary,[primary,other]);
 assert.equal(view.lifetimeRevenueCents,300);assert.equal(view.phone,'111');assert.equal(view.nextServiceDate,'2027-03-01');
 assert.equal(view.messaging.consents.maintenanceReminders.accepted,false);assert.equal(view.lastServiceLabel,'Actual service');
 assert.deepEqual([primary,other],before);assert.equal(view.identitySources.length,2);
});
test('unreconciled or overflowing totals are unknown instead of a fabricated zero',()=>{
 for(const amount of ['100',-1,Number.MAX_SAFE_INTEGER]){
  const view=customerIdentityView({id:'a'},[{id:'a',lifetimeRevenueCents:amount},{id:'b',lifetimeRevenueCents:1}]);
  assert.equal(view.revenueUnavailable,true);assert.equal(view.lifetimeRevenueCents,null);
 }
});
test('ordinary customers do not add identity database reads',async()=>{
 const rows=[{id:'a',name:'Normal'}],db={collection(){throw Error('unused')}};
 assert.deepEqual(await consolidatedCustomers(db,'organizations/test',[]),[]);
 assert.deepEqual(await consolidatedCustomers(db,'organizations/test',rows),rows);
});
test('merge control requires management and includes explicit review and reason',()=>{
 const customers=[{id:'a',name:'A'},{id:'b',name:'B'}];
 assert.equal(renderCustomerMerge({customers,lang:'pt',esc:String,allowed:false}),'');
 const html=renderCustomerMerge({customers,lang:'pt',esc:String,allowed:true,hasMore:true});
 assert.match(html,/name="reason"/);assert.match(html,/minlength="8"/);assert.match(html,/data-merge-preview/);assert.match(html,/Carregue mais clientes/);
});
test('operational actions retain each original contact date, consent and cooldown instead of unified projections',()=>{
 const primary={id:'a',nextServiceDate:'2099-05-01',phone:'111',messaging:{consents:{maintenanceReminders:{accepted:true}}}},
  alias={id:'b',nextServiceDate:'2026-01-01',phone:'222',messaging:{consents:{maintenanceReminders:{accepted:false}}}},
  unified=customerIdentityView(primary,[primary,alias]),latestAlias={...alias,lastAssistanceOutcome:{outcome:'declined'}};
 assert.equal(unified.nextServiceDate,'2026-01-01');
 const originals=customerOperationalSources([unified],[latestAlias]);
 assert.equal(originals.length,2);assert.equal(originals[0].nextServiceDate,'2099-05-01');assert.equal(originals[1].phone,'222');
 assert.equal(originals[1].messaging.consents.maintenanceReminders.accepted,false);assert.equal(originals[1].lastAssistanceOutcome.outcome,'declined');
});
