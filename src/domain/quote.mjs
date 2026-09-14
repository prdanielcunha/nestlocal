/**
 * Trusted server-side catalog only. This module does not authenticate callers,
 * reserve time, persist requests, or authorize payment.
 */
export function quote({ catalog, request, now }) {
  const fail = (message) => { throw new TypeError(message); };
  const str = (v) => typeof v === 'string' && v.trim().length > 0;
  const positive = (v) => Number.isSafeInteger(v) && v > 0;
  if (!catalog || !str(catalog.organizationId) || !str(catalog.version) ||
      catalog.status !== 'published' || catalog.currency !== 'BRL' ||
      !positive(catalog.validForMinutes) || catalog.validForMinutes > 1440 ||
      !Array.isArray(catalog.coverageCodes) || !catalog.coverageCodes.length ||
      !catalog.coverageCodes.every(str) || !Array.isArray(catalog.services) ||
      !catalog.services.length) fail('Invalid published catalog');
  const ids = new Set();
  for (const s of catalog.services) {
    if (!s || !str(s.id) || ids.has(s.id) ||
        !['fixed', 'review'].includes(s.mode)) fail('Invalid service');
    ids.add(s.id);
    if (s.mode === 'fixed' && (!positive(s.unitPriceCents) ||
        !positive(s.durationMinutes) || !positive(s.maxQuantity) ||
        s.maxQuantity > 10 || !Array.isArray(s.equipmentTypes) ||
        !s.equipmentTypes.length || !s.equipmentTypes.every(str) ||
        !str(s.inclusions) || !str(s.exclusions))) fail('Invalid fixed service');
  }
  if (!request || !positive(request.quantity) || request.quantity > 10 ||
      !str(request.serviceId) || !str(request.coverageCode)) fail('Invalid request');
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) fail('Invalid clock');
  const service = catalog.services.find(s => s.id === request.serviceId);
  if (!service) fail('Unknown service');
  const expires = now.getTime() + catalog.validForMinutes * 60000;
  if (!Number.isFinite(new Date(expires).getTime())) fail('Invalid expiry');
  const reasons = [];
  if (!catalog.coverageCodes.includes(request.coverageCode)) reasons.push('OUTSIDE_COVERAGE');
  if (service.mode === 'review') reasons.push('SERVICE_REQUIRES_REVIEW');
  if (service.mode === 'fixed') {
    if (!service.equipmentTypes.includes(request.equipmentType)) reasons.push('EQUIPMENT_REQUIRES_REVIEW');
    if (request.safeAccess !== true) reasons.push('ACCESS_REQUIRES_REVIEW');
    if (request.quantity > service.maxQuantity) reasons.push('QUANTITY_REQUIRES_REVIEW');
  }
  let totalCents = null;
  let durationMinutes = null;
  if (!reasons.length) {
    totalCents = service.unitPriceCents * request.quantity;
    durationMinutes = service.durationMinutes * request.quantity;
    if (!positive(totalCents) || !positive(durationMinutes)) fail('Numeric overflow');
  }
  return Object.freeze({
    organizationId: catalog.organizationId,
    catalogVersion: catalog.version,
    serviceId: service.id,
    quantity: request.quantity,
    currency: catalog.currency,
    outcome: reasons.includes('OUTSIDE_COVERAGE') ? 'unavailable' : reasons.length ? 'review' : 'priced',
    reasons: Object.freeze(reasons),
    unitPriceCents: reasons.length ? null : service.unitPriceCents,
    totalCents,
    durationMinutes,
    inclusions: service.inclusions ?? null,
    exclusions: service.exclusions ?? null,
    createdAt: now.toISOString(),
    expiresAt: new Date(expires).toISOString()
  });
}
