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


test('batch prospect ingestion deduplicates and caps payload size', () => {
  const server = read('../server.mjs');
  for (const token of [
    'const growthFingerprint=',
    'existingGrowthFingerprints',
    "where('fingerprint','in',part)",
    "/api/admin/nestlocal/growth/leads/batch",
    "input.length>50",
    'DUPLICATE_IN_BATCH',
    'ALREADY_EXISTS',
    "source:'batch_radar'",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('Radar can paste the existing Google Sheets lead table', () => {
  const client = read('../web/live.js');
  for (const token of [
    'function parseGrowthBatch',
    "radarTable=first[0]?.includes('empresa')",
    'growthBatchText',
    'growthBatchImport',
    "/api/admin/nestlocal/growth/leads/batch",
    'inferGrowthChannel',
    'inferGrowthAngle',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});


test('connected Prospect Radar sync preserves commercial state and exposes attack intelligence', () => {
  const server = read('../server.mjs');
  for (const token of [
    "parseRadarRows",
    "syncProspectRadar",
    "nestlocal_growth_sources/prospect_radar",
    "/api/admin/nestlocal/growth/radar/sync",
    "sourcePresent:false",
    "growthAttackScore",
    "segmentLearningScores",
    "painQualifiedAt",
    "RADAR_SOURCE_FORBIDDEN",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('Radar UI exposes source delta, attack queue and automatic stale refresh', () => {
  const client = read('../web/live.js');
  for (const token of [
    "growthRadarSourceView",
    "growthAttackQueueView",
    "growthSegmentLearningView",
    "syncGrowthRadar",
    "source?.stale",
    "growthRadarSync",
    "radarPainHypothesis",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});


test('attack queue logs contact attempts and publishes learning feedback', () => {
  const server = read('../server.mjs');
  for (const token of [
    "/growth/leads/:leadId/contact",
    "contact_attempt",
    "contactCount",
    "publishGrowthLearningFeedback",
    "NESTLOCAL_RADAR_FEEDBACK_SHEET_ID",
    "refreshGrowthAttackBaselines",
    "previousAttackScore",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('attack queue UI explains priority and supports one-click WhatsApp logging', () => {
  const client = read('../web/live.js');
  for (const token of [
    "radarWhyNow",
    "radarWhatsappLog",
    "data-growth-contact",
    "growthPublishLearning",
    "radarLearningFeedback",
    "attackReason_follow_up_due",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});
