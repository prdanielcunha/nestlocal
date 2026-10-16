import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCustomerSite} from '../src/domain/customer-sites.mjs';
import {customerSiteRequestSnapshot} from '../src/domain/customer-site-request.mjs';

test('C19: multiple addresses and equipment stay in separately bounded site records',()=>{
 assert.deepEqual(validateCustomerSite({
  label:'Casa de praia',line:'Rua dos Jardins, 20',city:'Londrina',notes:'Acesso lateral',
  equipment:['Ar-condicionado sala','Máquina de lavar']
 }),{label:'Casa de praia',line:'Rua dos Jardins, 20',city:'Londrina',
  notes:'Acesso lateral',equipment:['Ar-condicionado sala','Máquina de lavar']});
});
test('C19: malformed locations or equipment are rejected rather than truncated to unsafe structures',()=>{
 const site={label:'Matriz',line:'Rua Principal 40',city:'Cambé',notes:'',equipment:[]};
 assert.throws(()=>validateCustomerSite({...site,label:'x'}),{message:'INVALID_CUSTOMER_SITE'});
 assert.throws(()=>validateCustomerSite({...site,line:'x'}),{message:'INVALID_CUSTOMER_SITE'});
 assert.throws(()=>validateCustomerSite({...site,equipment:Array(21).fill('Teste')}),{message:'INVALID_CUSTOMER_SITE'});
 assert.throws(()=>validateCustomerSite({...site,equipment:['Máquina','máquina']}),{message:'INVALID_CUSTOMER_SITE'});
 assert.throws(()=>validateCustomerSite({...site,equipment:null}),{message:'INVALID_CUSTOMER_SITE'});
});
test('C19 C21: sites use transaction, revision guard, tenant-scoped audit and explicit write role',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 assert.match(server,/canManageNestLocalSites=access/);
 assert.match(server,/permissions\?\.sitesWrite===true/);
 assert.match(server,/app\.get\('\/api\/organizations\/:orgId\/nestlocal\/customers\/:customerId\/sites'/);
 assert.match(server,/app\.post\('\/api\/organizations\/:orgId\/nestlocal\/customers\/:customerId\/sites'/);
 assert.match(server,/app\.patch\('\/api\/organizations\/:orgId\/nestlocal\/customers\/:customerId\/sites\/:siteId'/);
 assert.match(server,/CUSTOMER_SITE_REVISION_CHANGED/);
 assert.match(server,/customers\.site_created/);
 assert.match(server,/tx\.create\(audit/);
 assert.match(ui,/function customerSitesPanel\(customer\)/);
 assert.match(ui,/data-customer-site-save/);
 assert.match(ui,/S\.customerSites=\{\}/);
 assert.match(ui,/data-customer-site-save/);
 assert.match(ui,/form\.dataset\.customerSiteSave&&'site:'/);
 assert.match(ui,/clearTransientForm\(form\);render\(\);toast\(t\('siteSaved'\)\)/);
});

test('C19: existing locations prefill new requests without modifying historical data',()=>{
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 assert.match(ui,/data-new-request-for-site/);
 assert.match(ui,/form\.elements\.coverageCode\.value=found\.value/);
 assert.match(ui,/addressLine:site\.line,city:site\.city/);
 assert.match(ui,/S\.customerSites\?\.\[id\]\?\.items/);
});

test('C21: a late location refresh cannot leak across organizations',()=>{
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 assert.match(ui,/const updated=await api\(base\);if\(org!==S\.orgId\)return;/);
 assert.match(ui,/S\.orgId=e\.target\.value;S\.pendingRequestSite=null;S\.pendingManualRequestKey='';S\.unsavedFormDrafts\.clear\(\);S\.customerSites=\{\}/);
});

test('C09 C19: repeated creation of the same customer site does not inflate limits',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/customers/:customerId/sites'");
 const end=server.indexOf("app.patch('/api/organizations/:orgId/nestlocal/customers/:customerId/sites",start);
 const route=server.slice(start,end);
 assert.match(route,/siteId=hash\(customerId\+'\|'\+site\.label\.toLowerCase\(\)/);
 assert.match(route,/const \[owner,existing\]=await Promise\.all\(\[tx\.get\(base\),tx\.get\(ref\)\]\)/);
 assert.match(route,/if\(existing\.exists\)/);
 assert.match(route,/idempotent=true;return;/);
 assert.match(route,/res\.status\(idempotent\?200:201\)/);
 assert.match(route,/CUSTOMER_SITE_ALREADY_EXISTS/);
});

test('C19: saved equipment and location become a versioned immutable request snapshot',()=>{
 const site={revision:3,label:'Matriz',line:'Rua Principal 40',city:'Cambé',equipment:['Ar-condicionado']};
 const input={customerId:'customer1',siteId:'siteA',revision:3,addressLine:' Rua Principal 40 ',city:'cambé'};
 const snap=customerSiteRequestSnapshot(site,input);
 assert.deepEqual(snap,{id:'siteA',customerId:'customer1',revision:3,label:'Matriz',equipment:['Ar-condicionado']});
 site.equipment.push('Máquina nova');
 assert.deepEqual(snap.equipment,['Ar-condicionado']);
 assert.throws(()=>customerSiteRequestSnapshot({...site,revision:4},input),{message:'CUSTOMER_SITE_REVISION_CHANGED'});
 assert.throws(()=>customerSiteRequestSnapshot(site,{...input,city:'Londrina'}),{message:'CUSTOMER_SITE_ADDRESS_CHANGED'});
 assert.throws(()=>customerSiteRequestSnapshot(null,input),{message:'CUSTOMER_SITE_NOT_FOUND'});
});
test('C19/C09: request creation validates owner-bound location in the same transaction and hashes the selected site',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests'");
 const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/quote'",start);
 const block=server.slice(start,end);
 assert.match(block,/customerSiteRef=customerSiteId\?customerRef\.collection\('sites'\)/);
 assert.match(block,/customerSiteRequestSnapshot\(doc\.data\(\),/);
 assert.match(block,/customerSiteRef\?tx\.get\(customerRef\)/);
 assert.match(block,/creationContentHash=hash\(JSON\.stringify\(\{[\s\S]*?customerSiteId,siteRevision,sourceDraftId/);
 assert.match(block,/tx\.create\(requestRef,\{\.\.\.record,\.\.\.siteSnapshot\(site,siteOwner\)\}\)/);
 assert.match(ui,/name="customerSiteId"/);
 assert.match(ui,/name="customerSiteRevision"/);
 assert.match(ui,/S\.pendingRequestSite=\{siteId,customerId:id,revision:/);
 assert.match(ui,/customerSiteId:f\.get\('customerSiteId'\)/);
});

test('C19: equipment selection is optional, revision-locked and cannot forge other customer equipment',()=>{
 const site={revision:2,label:'Home',line:'Rua A 10',city:'Londrina',equipment:['Ar-condicionado','Purificador']};
 const inputs={customerId:'c42',siteId:'s42',revision:2,addressLine:'Rua A 10',city:'Londrina'};
 const selected=customerSiteRequestSnapshot(site,{...inputs,selectedEquipment:'purificador'});
 assert.equal(selected.selectedEquipment,'Purificador');
 assert.deepEqual(selected.equipment,['Ar-condicionado','Purificador']);
 const defaultSelection=customerSiteRequestSnapshot(site,inputs);
 assert.equal(Object.hasOwn(defaultSelection,'selectedEquipment'),false);
 assert.throws(()=>customerSiteRequestSnapshot(site,{...inputs,selectedEquipment:'Geladeira'}),{message:'CUSTOMER_SITE_EQUIPMENT_CHANGED'});
 assert.throws(()=>customerSiteRequestSnapshot({...site,revision:3},{...inputs,selectedEquipment:'Purificador'}),{message:'CUSTOMER_SITE_REVISION_CHANGED'});
 const api=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const live=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 assert.match(api,/selectedEquipment:customerSiteEquipment/);
 assert.match(api,/CUSTOMER_SITE_EQUIPMENT_CHANGED/);
 assert.match(live,/data-site-equipment-wrap/);
 assert.match(live,/customerSiteEquipment:f\.get\('customerSiteEquipment'\)/);
});

test('C16/C19: choosing a site discards old request drafts and manual address edits clear the optional equipment',()=>{
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 assert.match(ui,/key\.endsWith\('\|'\+S\.orgId\+'\|internal-request'\)/);
 assert.match(ui,/S\.unsavedFormDrafts\.delete\(key\)/);
 assert.match(ui,/form\.elements\.customerSiteEquipment\.value=''/);
 assert.match(ui,/S\.pendingRequestSite=null;S\.pendingManualRequestKey=''/);
});
