import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('capacity is explicit and empty by default', () => {
  const server = read('../server.mjs');
  assert.ok(server.includes("capacity:{workingDays:[],windows:[]}"));
  assert.ok(server.includes("timezone=clean(b.timezone||'America/Sao_Paulo')"));
  assert.ok(server.includes("timezone,capacity:{workingDays:[],windows:[]}"));
  assert.ok(server.includes("const capacityWindows=new Set(['morning','afternoon','evening'])"));
});

test('capacity updates use an isolated authenticated endpoint', () => {
  const server = read('../server.mjs');
  const start = server.indexOf("app.put('/api/organizations/:orgId/nestlocal/capacity'");
  const end = server.indexOf("app.put('/api/organizations/:orgId/nestlocal/services/:serviceId'", start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.ok(route.includes("authenticate,authorize"));
  assert.ok(route.includes("validTimeZone"));
  assert.ok(route.includes("'capacity.workingDays'"));
  assert.ok(route.includes("'capacity.windows'"));
  assert.equal(route.includes("published:false"), false);
});

test('Smart Fill uses configured capacity real team and reserved work', () => {
  const client = read('../web/live.js');
  for (const token of [
    'function smartFillSnapshot',
    'capacity.workingDays',
    'capacity.windows',
    ".filter(x=>x.nestlocalEnabled)",
    "['scheduled','in_progress'].includes(r.status)",
    "r.schedule?.assignedTo===member.uid",
    "Math.min(slots.length,due.length)",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('Smart Fill never invents a monetary opportunity', () => {
  const client = read('../web/live.js');
  const start = client.indexOf('function smartFillSnapshot');
  const end = client.indexOf('function nextBestActions', start);
  const block = client.slice(start, end);
  assert.equal(block.includes('averageTicket'), false);
  assert.equal(block.includes('Revenue'), false);
  assert.equal(block.includes('totalCents'), false);
});

test('capacity configuration is separate from catalog settings', () => {
  const client = read('../web/live.js');
  assert.ok(client.includes('id="capacity-settings"'));
  assert.ok(client.includes("/nestlocal/capacity"));
  assert.ok(client.includes("f.getAll('capacityDay').map(Number)"));
  assert.ok(client.includes("f.getAll('capacityWindow')"));
});

test('Smart Fill styling exists', () => {
  const css = read('../web/operations.css');
  assert.ok(css.includes('.capacity-settings'));
  assert.ok(css.includes('.smart-fill-card'));
  assert.ok(css.includes('.smart-fill-metrics'));
});
