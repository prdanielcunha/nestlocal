import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCustomerBatch} from '../web/customer-import.js';

test('CSV recognizes BOM, reordered bilingual headers, quoted commas and escaped quotes',()=>{
 const [row]=parseCustomerBatch('\uFEFFPhone,Name,Address,Next return\r\n5511999999999,"Ana, ""AC""","Rua A, 10",17/10/2026');
 assert.equal(row.name,'Ana, "AC"');assert.equal(row.addressLine,'Rua A, 10');
 assert.equal(row.nextServiceDate,'2026-10-17');assert.equal(row.city,'');
 assert.equal(row.lastServiceDate,'');
});
test('semicolon CSV preserves multiline text and TSV preserves existing positional layout',()=>{
 const [csv]=parseCustomerBatch('Nombre;Teléfono;Motivo del retorno\r\nAna;5511999999999;"Volver\r\nen noviembre"');
 assert.equal(csv.nextServiceReason,'Volver\r\nen noviembre');
 const [tsv]=parseCustomerBatch('Ana\t5511999999999\tRecife\tRua A\tLimpeza\t1/2/2024\t29/2/2024\tRetorno');
 assert.equal(tsv.lastServiceDate,'2024-02-01');assert.equal(tsv.nextServiceDate,'2024-02-29');
});
test('bad dates and incomplete rows remain visible for API validation instead of disappearing',()=>{
 const rows=parseCustomerBatch('Nome;WhatsApp;Próximo retorno\nAna;5511999999999;31/02/2026\nBia;;nunca');
 assert.equal(rows.length,2);assert.equal(rows[0].nextServiceDate,'2026-02-31');
 assert.equal(rows[1].nextServiceDate,'nunca');assert.equal(rows[1].phone,'');
});
test('rejects truncation, malformed quotes, ambiguous columns and oversized files',()=>{
 assert.throws(()=>parseCustomerBatch(Array.from({length:101},()=> 'Ana\t5511999999999').join('\n')),/ROW_LIMIT/);
 assert.equal(parseCustomerBatch('Nome;WhatsApp\n'+Array.from({length:100},()=> 'Ana;5511999999999').join('\n')).length,100);
 for(const csv of ['"Ana,5511999999999','"Ana"oops,5511999999999','Nome;WhatsApp;Telefone\nAna;5511999999999;5511888888888'])
  assert.throws(()=>parseCustomerBatch(csv),/INVALID/);
 assert.throws(()=>parseCustomerBatch('é'.repeat(32769)),/FILE_LIMIT/);
});
