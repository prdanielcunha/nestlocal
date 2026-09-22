import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('maintenance plans are tenant scoped, validated and synchronize the next visit',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.put('/api/organizations/:orgId/nestlocal/customers/:customerId/maintenance-plan'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/playbooks/:template/apply'",start);
  const block=server.slice(start,end);
  assert.ok(start>=0);
  for(const token of [
    'authenticate,authorize',
    'INVALID_MAINTENANCE_PLAN',
    'intervalDays<0||intervalDays>730',
    "nextServiceSource='maintenance_plan'",
    "current.nextServiceSource==='maintenance_plan'",
    'updatedBy:req.identity.uid',
    'CUSTOMER_NOT_FOUND',
  ]) assert.ok(block.includes(token), `missing ${token}`);
});

test('customer maintenance UI supports plan dates frequency notes and safe routes',()=>{
  const client=read('../web/live.js');
  for(const token of [
    'function maintenancePlanForm(customer)',
    'data-maintenance-plan',
    "name=\"intervalDays\"",
    "name=\"contractStart\"",
    "name=\"contractEnd\"",
    "name=\"nextVisitDate\"",
    'const routeUrl=',
    'https://www.google.com/maps/search/?api=1&query=',
    'planSaved',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('field operations expose printable work order from real request facts',()=>{
  const client=read('../web/live.js');
  for(const token of [
    'function serviceReportHtml(r)',
    'function printServiceReport(r)',
    'data-service-report',
    "t('reportExecution')",
    "t('reportPayment')",
    "t('reportWarranty')",
    "t('reportReturn')",
    'window.print()',
  ]) assert.ok(client.includes(token), `missing ${token}`);
  assert.equal(client.includes('generateFakeReport'),false);
});

test('maintenance plan surfaces remain responsive',()=>{
  const css=read('../web/operations.css');
  for(const token of [
    '.maintenance-plan-card',
    '.maintenance-plan-form',
    '.agenda-actions',
    '@media(max-width:620px)',
  ]) assert.ok(css.includes(token), `missing ${token}`);
});
