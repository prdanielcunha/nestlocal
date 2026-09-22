import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('existing organizations can safely add another segment without overwriting services',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/playbooks/:template/apply'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/bootstrap'",start);
  const block=server.slice(start,end);
  assert.ok(start>=0);
  for(const token of ['canManageNestLocal','servicePlaybooks[template]','db.getAll','filter(x=>!x.exists)','batch.create','published:false','REVIEW_CATALOG_BEFORE_PUBLISH']) assert.ok(block.includes(token),`missing ${token}`);
  assert.equal(block.includes('batch.set(item.ref'),false,'existing service documents must not be overwritten');
});

test('catalog accelerator is available in PT EN ES and wired to the apply endpoint',()=>{
  const client=read('../web/live.js');
  for(const token of ['catalogAccelerator','catalogAcceleratorHelp','playbookChoices','playbook-add-select','playbook-add',"playbooks/\${encodeURIComponent(template)}/apply"]) assert.ok(client.includes(token),`missing ${token}`);
  assert.ok(client.includes("templateElectrical:'Elétrica e manutenção'"));
  assert.ok(client.includes("templateElectrical:'Electrical & maintenance'"));
  assert.ok(client.includes("templateElectrical:'Electricidad y mantenimiento'"));
});
