import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCustomerSite} from '../src/domain/customer-sites.mjs';

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
});
