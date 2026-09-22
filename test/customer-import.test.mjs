import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('customer spreadsheet import is tenant-scoped and does not fabricate messaging consent',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/customers/batch'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/bootstrap'",start);
  const block=server.slice(start,end);
  assert.ok(start>=0);
  for(const token of ['INVALID_CUSTOMER_BATCH','customer_import','nextServiceDate','lastServiceLabel','db.getAll','batch.set']) assert.ok(block.includes(token),`missing ${token}`);
  assert.equal(block.includes('messaging.consents'),false);
  assert.equal(block.includes('maintenanceReminders'),false);
});

test('customer import UI parses Sheets-style rows and supports Brazilian dates',()=>{
  const client=read('../web/live.js');
  for(const token of ['function parseCustomerBatch(text)','const importDate=','customerBatchText','customerBatchImport','customerImportPlaceholder']) assert.ok(client.includes(token),`missing ${token}`);
  assert.ok(client.includes("m[3]}-"));
});
