import test from 'node:test';
import assert from 'node:assert/strict';
import { quote } from '../src/domain/quote.mjs';

// Synthetic values for testing; never a published commercial catalog.
const fixture = () => ({
 catalog: { organizationId: 'test-org', version: 'v1', status: 'published',
 currency: 'BRL', validForMinutes: 30, coverageCodes: ['test-city'],
 services: [{ id: 'clean', mode: 'fixed', unitPriceCents: 15000,
 durationMinutes: 60, maxQuantity: 4, equipmentTypes: ['split'],
 inclusions: 'Fixture cleaning', exclusions: 'Fixture repairs' },
 { id: 'install', mode: 'review' }] },
 request: { serviceId: 'clean', quantity: 2, coverageCode: 'test-city',
 equipmentType: 'split', safeAccess: true },
 now: new Date('2026-09-14T12:00:00Z')
});
test('integer price and duration, deterministic expiry', () => {
 const result = quote(fixture());
 assert.equal(result.outcome, 'priced');
 assert.equal(result.totalCents, 30000);
 assert.equal(result.durationMinutes, 120);
 assert.equal(result.expiresAt, '2026-09-14T12:30:00.000Z');
});
test('outside coverage never returns a price', () => {
 const input = fixture(); input.request.coverageCode = 'outside';
 assert.equal(quote(input).outcome, 'unavailable');
 assert.equal(quote(input).totalCents, null);
});
for (const [field, value, reason] of [
 ['equipmentType', undefined, 'EQUIPMENT_REQUIRES_REVIEW'],
 ['safeAccess', undefined, 'ACCESS_REQUIRES_REVIEW'],
 ['safeAccess', 'true', 'ACCESS_REQUIRES_REVIEW'],
 ['quantity', 5, 'QUANTITY_REQUIRES_REVIEW'],
 ['serviceId', 'install', 'SERVICE_REQUIRES_REVIEW']
]) test('review: ' + field + '=' + value, () => {
 const input = fixture(); input.request[field] = value;
 const result = quote(input);
 assert.equal(result.outcome, 'review');
 assert.equal(result.totalCents, null);
 assert.ok(result.reasons.includes(reason));
});
for (const quantity of [-1, 0, 1.5, '2', NaN, Infinity, 11, Number.MAX_SAFE_INTEGER]) {
 test('reject invalid quantity ' + quantity, () => {
  const input = fixture(); input.request.quantity = quantity;
  assert.throws(() => quote(input), TypeError);
 });
}
test('missing or invalid catalog price is configuration failure', () => {
 for (const value of [undefined, 0, -1, 1.5, '15000']) {
  const input = fixture(); input.catalog.services[0].unitPriceCents = value;
  assert.throws(() => quote(input), TypeError);
 }
});
test('unpublished catalog and duplicate ids fail closed', () => {
 const a = fixture(); a.catalog.status = 'draft';
 assert.throws(() => quote(a), TypeError);
 const b = fixture(); b.catalog.services.push({...b.catalog.services[0]});
 assert.throws(() => quote(b), TypeError);
});
test('unknown service cannot supply its own price', () => {
 const input = fixture(); input.request.serviceId = 'unknown';
 input.request.unitPriceCents = 1;
 assert.throws(() => quote(input), TypeError);
});
test('caller cannot override trusted price or organization', () => {
 const input = fixture();
 Object.assign(input.request, { unitPriceCents: 1, organizationId: 'other' });
 const result = quote(input);
 assert.equal(result.totalCents, 30000);
 assert.equal(result.organizationId, 'test-org');
});
test('overflow and invalid clock are rejected', () => {
 const a = fixture(); a.catalog.services[0].unitPriceCents = Number.MAX_SAFE_INTEGER;
 assert.throws(() => quote(a), TypeError);
 const b = fixture(); b.now = new Date('invalid');
 assert.throws(() => quote(b), TypeError);
});
test('immutable snapshot survives later catalog changes without mutating input', () => {
 const input = fixture(); const before = JSON.stringify(input);
 const result = quote(input);
 assert.equal(JSON.stringify(input), before);
 input.catalog.services[0].unitPriceCents = 99999;
 input.catalog.version = 'v2';
 assert.equal(result.totalCents, 30000);
 assert.equal(result.catalogVersion, 'v1');
 assert.throws(() => { result.totalCents = 1; }, TypeError);
 assert.throws(() => result.reasons.push('injected'), TypeError);
});
