import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSiteImport,planSiteImport} from '../src/domain/customer-site-import.mjs';
import {parseSiteBatch,renderSiteImport} from '../web/site-import.js';
const site={label:'Matriz',line:'Rua Exemplo, 123',city:'Londrina',notes:'Recepção',equipment:['Split sala']};
test('site CSV maps localized headers, quoted delimiters, repeated sites and individual equipment',()=>{
 const parsed=parseSiteBatch('\uFEFFEquipamento;Cidade;Local;Endereço;Observações\n"Split, sala";Londrina;Matriz;"Rua Exemplo, 123";Recepção\nSplit cozinha;Londrina;Matriz;"Rua Exemplo, 123";Recepção');
 assert.equal(parsed.length,1);assert.deepEqual(parsed[0].equipment,['Split, sala','Split cozinha']);assert.deepEqual(parsed[0].sourceRows,[2,3]);
 assert.equal(parseSiteBatch('Site\tAddress\tCity\nOffice\tExample road\tLondon')[0].equipment.length,0);
 assert.equal(parseSiteBatch('Ubicación,Dirección,Ciudad,Equipo\nSede,Calle Central,Madrid,Filtro')[0].label,'Sede');
});
test('invalid site spreadsheets never silently discard columns, rows or equipment',()=>{
 for(const text of ['Local;Endereço\nMatriz;Rua abc','Local;Local;Endereço;Cidade\nMatriz;Matriz;Rua abc;Test','Local;Endereço;Cidade;Marca\nMatriz;Rua abc;Test;AC','Local;Endereço;Cidade\nMatriz;Rua abc;Test;extra','Local;Endereço;Cidade\nMatriz;"Rua abc;Test','Local;Endereço;Cidade\nMatriz;x;Test'])assert.throws(()=>parseSiteBatch(text));
 assert.throws(()=>parseSiteBatch('Local;Endereço;Cidade;Equipamento\nMatriz;Rua abc;Test;AC\nMatriz;Rua abc;Test;ac'),/EQUIPMENT_DUPLICATE/);
 assert.throws(()=>parseSiteBatch('Local;Endereço;Cidade;Observações\nMatriz;Rua abc;Test;A\nMatriz;Rua abc;Test;B'),/NOTES_CONFLICT/);
 assert.throws(()=>parseSiteBatch('x'.repeat(65537)),/FILE_LIMIT/);
});
test('bulk site limits are enforced before any write, including long fields and duplicate identities',()=>{
 assert.throws(()=>normalizeSiteImport([]));assert.throws(()=>normalizeSiteImport(Array(21).fill(site)));
 assert.throws(()=>normalizeSiteImport([site,{...site,label:'MATRIZ'}]));
 assert.throws(()=>normalizeSiteImport([{...site,line:'x'.repeat(181)}]));
 assert.throws(()=>normalizeSiteImport([{...site,equipment:['x'.repeat(101)]}]));
 assert.throws(()=>parseSiteBatch('Local;Endereço;Cidade;Equipamento\n'+Array.from({length:21},(_,i)=>`Matriz;Rua abc;Test;AC ${i}`).join('\n')),/SITE_IMPORT_LIMIT/);
});
test('site preview differentiates creates, exact existing records and conflicts without overwrite',()=>{
 const existing=[{id:'old',data:{...site,createdAt:'retained',revision:2}}];
 assert.equal(planSiteImport([site],existing).rows[0].status,'existing');
 assert.equal(planSiteImport([{...site,notes:'Changed'}],existing).canImport,false);
 assert.equal(planSiteImport([{...site,label:'Filial'}],existing).counts.create,1);
 const full=Array.from({length:20},(_,i)=>({id:String(i),data:{...site,label:'Local '+i}}));
 assert.equal(planSiteImport([site],full).withinLimit,false);
 assert.throws(()=>planSiteImport([site],[{id:'bad',data:{}}]),/EXISTING_INVALID/);
});
test('localized site import uses an explicit review action and accessible status',()=>{
 for(const lang of ['pt','en','es']){
  const html=renderSiteImport('customer',lang,String);
  assert.match(html,/data-site-preview/);assert.match(html,/role="status"/);assert.match(html,/type="submit"/);
 }
});
