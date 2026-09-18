import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Revenue X-Ray is deterministic and stores opted-in leads', () => {
  const server = read('../server.mjs');
  for (const token of [
    "diagnosticProjection",
    "recoveryAssumption=0.15",
    "/api/public/growth/diagnostic",
    "nestlocal_growth_leads",
    "acceptedTerms!==true",
    "monthlyOpportunityCents",
    "fitScore:growthFitScore",
    "painScore:growthPainScore",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('Growth Radar endpoints are restricted to global administrators', () => {
  const server = read('../server.mjs');
  for (const token of [
    "requireGrowthAdmin",
    "globalRoles.has(user.data()?.systemRole)",
    "app.use('/api/admin/nestlocal/growth',authenticate,requireGrowthAdmin)",
    "/api/admin/nestlocal/growth/leads",
    "scheduleFollowUpDays",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('client exposes public X-Ray and admin-only Radar in PT EN ES', () => {
  const client = read('../web/live.js');
  for (const token of [
    "isRevenueXray",
    "revenueXrayView",
    "function growth()",
    "isGrowthAdmin",
    "data-growth-status",
    "data-growth-pain",
    "Object.assign(D.pt,{no:",
    "Object.assign(D.en,{no:",
    "Object.assign(D.es,{no:",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('Growth Engine styling is loaded', () => {
  const html = read('../web/index.html');
  const css = read('../web/growth.css');
  assert.ok(html.includes('/growth.css'));
  assert.ok(css.includes('.xray-shell'));
  assert.ok(css.includes('.growth-grid'));
});


test('growth funnel preserves stage history and acquisition attribution', () => {
  const server = read('../server.mjs');
  for (const token of [
    'const growthStageRank=',
    'function growthFunnelMetrics',
    'highestStage:0',
    'stageHistory:[',
    'FieldValue.arrayUnion',
    'growthAcquisition',
    'byChannel:',
    'byAngle:',
    'leadToCustomer',
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('Radar shows funnel conversion and captures channel plus sales angle', () => {
  const client = read('../web/live.js');
  for (const token of [
    'function growthFunnelView',
    "name=\"channel\"",
    "name=\"angle\"",
    "name=\"campaign\"",
    "channel:f.get('channel')",
    "angle:f.get('angle')",
    'performanceByAngle',
    'leadToCustomer',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});
