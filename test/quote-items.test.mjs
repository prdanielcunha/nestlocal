import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateQuoteItems} from '../src/domain/quote-items.mjs';

test('itemized quotes calculate in cents and preserve legacy flat quotes',()=>{
 assert.deepEqual(validateQuoteItems(undefined,5000),[]);
 assert.deepEqual(validateQuoteItems([],5000),[]);
 assert.deepEqual(validateQuoteItems([
 {description:'Visita técnica',quantity:1,unitPriceCents:8500},
 {description:'Material',quantity:2,unitPriceCents:1550}
 ],11600),[
 {description:'Visita técnica',quantity:1,unitPriceCents:8500,totalCents:8500},
 {description:'Material',quantity:2,unitPriceCents:1550,totalCents:3100}
 ]);
});
test('itemized proposals never silently disagree with the amount approved',()=>{
 const item={description:'Serviço',quantity:2,unitPriceCents:4000};
 assert.throws(()=>validateQuoteItems([item],7999),{message:'QUOTE_ITEMS_TOTAL_MISMATCH'});
 assert.throws(()=>validateQuoteItems([{...item,quantity:0}],0),{message:'INVALID_QUOTE_ITEMS'});
 assert.throws(()=>validateQuoteItems([{...item,unitPriceCents:-1}],0),{message:'INVALID_QUOTE_ITEMS'});
 assert.throws(()=>validateQuoteItems([{...item,description:'x'}],8000),{message:'INVALID_QUOTE_ITEMS'});
 assert.throws(()=>validateQuoteItems(Array.from({length:21},()=>item),168000),{message:'INVALID_QUOTE_ITEMS'});
 assert.throws(()=>validateQuoteItems([{...item,quantity:1000,unitPriceCents:100000000}],100000000),{message:'INVALID_QUOTE_ITEMS'});
});
test('quote revisions persist the line breakdown and preserve manual total',()=>{
 const api=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 const begin=api.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/quote'");
 const route=api.slice(begin,api.indexOf('\napp.',begin+10));
 assert.match(route,/validateQuoteItems\(req\.body\?\.items,amountCents\)/);
 assert.match(route,/manualNote:note,items:lineItems,version:/);
 assert.match(route,/tx\.create\(revisionRef/);
 assert.match(ui,/function quoteItemsField\(quote\)/);
 assert.match(ui,/const itemized=Array\.isArray\(q\.items\)/);
 assert.match(ui,/\$\{decision\}\$\{itemized\}\$\{quoteDecision\}/);
 assert.match(ui,/data-add-quote-item/);
 assert.match(ui,/JSON\.stringify\(\{amountCents,note:f\.get\('quoteNote'\)\|\|'',items\}\)/);
});
