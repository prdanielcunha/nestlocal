import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('assistance events are explicit human-completed actions', () => {
  const server = read('../server.mjs');
  for (const token of [
    "const assistanceActionTypes=new Set(['quote_followup','customer_reactivation'])",
    "status:'completed_by_user'",
    "FOLLOWUP_NOT_DUE",
    "REACTIVATION_NOT_DUE",
    "nestlocal_action_events",
    "lastAssistance",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('quote follow-up must be stale and reactivation must be due', () => {
  const server = read('../server.mjs');
  assert.ok(server.includes("now-updatedAt<48*60*60*1000"));
  assert.ok(server.includes("nextDate>today"));
});

test('new requests inherit only recent reactivation assistance', () => {
  const server = read('../server.mjs');
  for (const token of [
    "lastAssistance?.actionType==='customer_reactivation'",
    "freshAssistance(lastAssistance,90)",
    "requestRecord={...record}",
    "requestRecord.assistedAcquisition",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('accepted quotes bind recent quote follow-up assistance', () => {
  const server = read('../server.mjs');
  assert.ok(server.includes("current.lastAssistance?.actionType==='quote_followup'"));
  assert.ok(server.includes("freshAssistance(current.lastAssistance,30)"));
  assert.ok(server.includes("decisionUpdate.assistedConversion"));
  assert.ok(server.includes("update.assistedConversion"));
});

test('assisted revenue is recorded only on first completion', () => {
  const server = read('../server.mjs');
  const completionGuard = "const completedNow=nextStatus==='completed'&&!current.completionRecordedAt";
  assert.ok(server.includes(completionGuard));
  for (const token of [
    "nestlocal_revenue_events",
    "kind:'assisted'",
    "assistedRevenueCents:admin.firestore.FieldValue.increment",
    "assistedJobs:admin.firestore.FieldValue.increment(1)",
    "update['attribution.assisted']=true",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('Today labels the metric as assisted rather than causal revenue', () => {
  const client = read('../web/live.js');
  for (const token of [
    "assistedRevenue:'Receita assistida'",
    "não prova causalidade",
    "data-assistance=",
    "/nestlocal/action-events",
    "contactRecorded",
    "assisted-metric",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});


test('Home composition has no build-time placeholder left at runtime', () => {
  const client = read('../web/live.js');
  assert.equal(client.includes('metricAnchor'), false);
  assert.ok(client.includes("t('conversion')"));
  assert.ok(client.includes("assisted.assistedRevenueCents"));
});
