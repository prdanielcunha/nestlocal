export function buildOpportunitySnapshot({
  requests = [],
  customers = [],
  now = Date.now(),
  today = '',
  fill = { configured: false, slots: [], matchCount: 0 },
  readiness = {},
  timestampMs,
  actions = [],
}) {
  const followups = requests.filter((request) => {
    if (request.status !== 'quoted') return false;
    const at = timestampMs(request.updatedAt) || timestampMs(request.createdAt);
    return !at || now - at >= 48 * 60 * 60 * 1000;
  });

  const quoteValueCents = followups.reduce(
    (sum, request) =>
      sum +
      Math.max(
        0,
        Number(
          request.commercial?.finalAmountCents ??
            request.quote?.totalCents ??
            0,
        ),
      ),
    0,
  );

  const receivableRows = requests.filter(
    (request) =>
      request.status === 'completed' &&
      ['pending', 'partial'].includes(request.commercial?.paymentStatus || ''),
  );

  const receivableCents = receivableRows.reduce(
    (sum, request) =>
      sum +
      Math.max(
        0,
        Number(
          request.commercial?.finalAmountCents ??
            request.quote?.totalCents ??
            0,
        ) - Number(request.commercial?.amountPaidCents || 0),
      ),
    0,
  );

  const dueReturns = customers.filter(
    (customer) =>
      customer.nextServiceDate &&
      customer.nextServiceDate <= today,
  );

  return {
    followups,
    quoteValueCents,
    receivableRows,
    receivableCents,
    dueReturns,
    fill,
    readiness,
    topAction: actions[0] || null,
  };
}

export function renderOpportunityPulse({ snapshot, t, esc, money }) {
  const top = snapshot.topAction;
  const topCta = top
    ? top.type === 'reactivate'
      ? '<button class="button small" data-scroll-reactivation="true">' +
        t('openAction') +
        '</button>'
      : '<button class="button small" data-action-page="requests">' +
        t('openAction') +
        '</button>'
    : '';

  const quoteDetail = snapshot.quoteValueCents
    ? money(snapshot.quoteValueCents) + ' ' + t('knownQuoteValue')
    : t('valueNotKnown');

  const capacityValue = snapshot.fill.configured
    ? String(snapshot.fill.slots.length)
    : '—';

  const capacityDetail = snapshot.fill.configured
    ? String(snapshot.fill.matchCount) + ' ' + t('possibleMatchesShort')
    : t('configureCapacity');

  return (
    '<article class="card opportunity-pulse">' +
      '<div class="pulse-head">' +
        '<div>' +
          '<span class="eyebrow">' + t('autopilotPulse') + '</span>' +
          '<h2>' + (top ? t('topMove') : t('allCaughtUp')) + '</h2>' +
          '<p class="help">' +
            (top
              ? t('action_' + top.type) + ' · ' + esc(top.customerName || '—')
              : t('allCaughtUpHelp')) +
          '</p>' +
        '</div>' +
        '<div class="pulse-trust">' +
          '<span>' + t('factsOnly') + '</span>' +
          topCta +
        '</div>' +
      '</div>' +
      '<div class="pulse-grid">' +
        '<button class="pulse-signal ' +
          (snapshot.followups.length ? 'attention' : '') +
          '" data-action-page="requests">' +
          '<span>' + t('stalledQuotes') + '</span>' +
          '<strong>' + esc(snapshot.followups.length) + '</strong>' +
          '<small>' + quoteDetail + '</small>' +
          '<em>' + t('stalledQuotesHelp') + '</em>' +
        '</button>' +
        '<button class="pulse-signal ' +
          (snapshot.receivableCents ? 'attention' : '') +
          '" data-action-page="requests">' +
          '<span>' + t('receivables') + '</span>' +
          '<strong>' + money(snapshot.receivableCents) + '</strong>' +
          '<small>' +
            esc(snapshot.receivableRows.length) +
            ' · ' +
            t('receivablesHelp') +
          '</small>' +
        '</button>' +
        '<button class="pulse-signal ' +
          (snapshot.dueReturns.length ? 'attention' : '') +
          '" data-scroll-reactivation="true">' +
          '<span>' + t('dueReturns') + '</span>' +
          '<strong>' + esc(snapshot.dueReturns.length) + '</strong>' +
          '<small>' +
            esc(snapshot.readiness.readyCount || 0) +
            ' ' +
            t('readyReminders') +
          '</small>' +
          '<em>' + t('dueReturnsHelp') + '</em>' +
        '</button>' +
        '<button class="pulse-signal ' +
          (snapshot.fill.matchCount ? 'opportunity' : '') +
          '" data-action-page="services">' +
          '<span>' + t('freeCapacity7d') + '</span>' +
          '<strong>' + capacityValue + '</strong>' +
          '<small>' + capacityDetail + '</small>' +
          '<em>' + t('freeCapacityHelp') + '</em>' +
        '</button>' +
      '</div>' +
    '</article>'
  );
}
