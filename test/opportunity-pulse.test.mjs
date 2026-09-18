import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildOpportunitySnapshot,
  renderOpportunityPulse,
} from '../web/opportunity-pulse.js';

const HOUR = 60 * 60 * 1000;

test('Opportunity Pulse uses only quotes due for follow-up after 48h', () => {
  const now = 100 * HOUR;
  const snapshot = buildOpportunitySnapshot({
    now,
    today: '2026-09-18',
    timestampMs: (value) => Number(value || 0),
    requests: [
      {
        status: 'quoted',
        updatedAt: now - 49 * HOUR,
        quote: { totalCents: 120000 },
      },
      {
        status: 'quoted',
        updatedAt: now - 47 * HOUR,
        quote: { totalCents: 990000 },
      },
      {
        status: 'accepted',
        updatedAt: now - 80 * HOUR,
        quote: { totalCents: 450000 },
      },
    ],
  });

  assert.equal(snapshot.followups.length, 1);
  assert.equal(snapshot.quoteValueCents, 120000);
});

test('Opportunity Pulse reports real outstanding balance from completed work', () => {
  const snapshot = buildOpportunitySnapshot({
    today: '2026-09-18',
    timestampMs: () => 0,
    requests: [
      {
        status: 'completed',
        commercial: {
          paymentStatus: 'partial',
          finalAmountCents: 100000,
          amountPaidCents: 25000,
        },
      },
      {
        status: 'completed',
        commercial: {
          paymentStatus: 'paid',
          finalAmountCents: 900000,
          amountPaidCents: 900000,
        },
      },
    ],
  });

  assert.equal(snapshot.receivableRows.length, 1);
  assert.equal(snapshot.receivableCents, 75000);
});

test('canonical reminder readiness count wins over the bounded customer list', () => {
  const snapshot = buildOpportunitySnapshot({
    today: '2026-09-18',
    timestampMs: () => 0,
    customers: [
      { nextServiceDate: '2026-09-01' },
    ],
    readiness: {
      dueCount: 200,
      dueCountTruncated: true,
      readyCount: 17,
    },
  });

  assert.equal(snapshot.dueReturns.length, 1);
  assert.equal(snapshot.dueReturnCount, 200);
  assert.equal(snapshot.dueCountTruncated, true);
  assert.equal(snapshot.readiness.readyCount, 17);
});

test('Opportunity Pulse preserves real free capacity and deterministic top action', () => {
  const topAction = {
    type: 'followup',
    customerName: 'Cliente A',
    priority: 76,
  };
  const snapshot = buildOpportunitySnapshot({
    today: '2026-09-18',
    timestampMs: () => 0,
    fill: {
      configured: true,
      slots: [{}, {}, {}, {}],
      matchCount: 3,
    },
    actions: [topAction],
  });

  assert.equal(snapshot.fill.slots.length, 4);
  assert.equal(snapshot.fill.matchCount, 3);
  assert.equal(snapshot.topAction, topAction);
});

test('rendered Pulse is action-first and does not claim projected revenue', () => {
  const snapshot = buildOpportunitySnapshot({
    today: '2026-09-18',
    timestampMs: () => 0,
    readiness: { dueCount: 200, dueCountTruncated: true, readyCount: 17 },
    fill: { configured: true, slots: [{}, {}], matchCount: 2 },
    actions: [{ type: 'reactivate', customerName: 'Cliente B' }],
  });

  const html = renderOpportunityPulse({
    snapshot,
    t: (key) => key,
    esc: (value) => String(value),
    money: (value) => 'money:' + value,
  });

  assert.match(html, /opportunity-pulse/);
  assert.match(html, /data-scroll-reactivation="true"/);
  assert.match(html, />200\+<\/strong>/);
  assert.match(html, /factsOnly/);
  assert.doesNotMatch(html.toLowerCase(), /estimated revenue|projected revenue|receita potencial|recovery assumption/);
});

test('Today integrates the Pulse with PT EN ES copy and responsive styling', () => {
  const client = readFileSync(new URL('../web/live.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../web/operations.css', import.meta.url), 'utf8');

  for (const token of [
    "autopilotPulse:'Pulso do Autopilot'",
    "autopilotPulse:'Autopilot Pulse'",
    "autopilotPulse:'Pulso del Autopilot'",
    'opportunityPulseCard()',
    "from './opportunity-pulse.js'",
  ]) assert.ok(client.includes(token), 'missing ' + token);

  assert.ok(css.includes('.opportunity-pulse'));
  assert.ok(css.includes('.pulse-grid'));
  assert.ok(css.includes('@media(max-width:620px)'));
});
