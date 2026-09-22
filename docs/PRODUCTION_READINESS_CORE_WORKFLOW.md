# Production Readiness — Core Operational Workflow

## Objective

Make NestLocal usable for real day-to-day service operations without relying on hidden status editing or demo-specific defaults.

## Onboarding

Initial setup now requires real business data:

- business name;
- covered cities/areas;
- WhatsApp;
- timezone;
- business playbook.

No production bootstrap contains hard-coded launch cities.

The initial catalog remains a draft until explicitly published.

## Publication readiness

The backend evaluates publication readiness before exposing the public store.

Checks include:

- business name;
- public slug;
- at least one coverage area;
- valid timezone;
- at least one service;
- valid fixed-service pricing/duration/quantity contract.

Publication returns `PUBLISH_NOT_READY` with concrete issue codes when any requirement is missing.

The UI shows these issues before the publish button is enabled.

## Internal request intake

Authenticated operators can create a request directly for customers who arrived through:

- phone;
- WhatsApp;
- referral;
- walk-in;
- another offline channel.

The request:

- respects the organization monthly plan request limit;
- uses the organization timezone for preferred-date validation and usage month;
- creates/updates the customer record;
- does not fabricate WhatsApp opt-in;
- starts at `new`.

## Manual quote

Requests in `new`, `reviewing`, or `quoted` may receive a manual quote.

The quote endpoint:

- requires a positive integer amount in cents;
- stores the amount as trusted server-side commercial data;
- records the operator;
- changes the request to `quoted`;
- does not create Assisted Revenue attribution.

## Secure customer quote link

A quote link is generated on demand after a quote exists.

The server returns a path containing a random token, while Firestore stores only token hashes.

A small rolling set of up to 3 hashes keeps recently issued links compatible during rotation.

The authorized Home payload strips both:

- `trackingTokenHash`;
- `trackingTokenHashes`.

## Customer decision

The existing public tracking route remains the customer approval surface.

A customer may:

- accept;
- decline.

Accepted quotes become `accepted` and enter the scheduling flow.

## Explicit lifecycle

The internal operational path is:

`new → reviewing → quoted → accepted → scheduled → in_progress → completed`

Terminal alternatives:

- `declined`;
- `cancelled`.

The backend rejects arbitrary lifecycle jumps.

Dedicated actions replace the generic status selector in the UI.

## Scheduling

Accepted work requires:

- date;
- service window;
- enabled assignee.

The existing transaction-based schedule-slot lock remains canonical and prevents two requests from occupying the same assignee/date/window.

The Agenda groups active scheduled/in-progress work by date.

## Execution and payment

In-progress work can be completed with:

- final amount;
- payment status;
- amount paid;
- execution notes;
- optional next-service date/reason.

Payment consistency is enforced:

- `pending` → paid amount must be 0;
- `partial` → paid amount must be > 0 and < final amount;
- `paid` → paid amount must equal final amount.

Completion continues to update customer lifetime revenue, recurrence rules, and Assisted Revenue when eligible.

## Customers

Customers now have a dedicated application surface showing:

- contact;
- lifetime revenue;
- last service;
- next service;
- return/reminder WhatsApp consent;
- safe call/WhatsApp actions.

## Empty states

Requests, Customers, and Agenda provide actionable next steps instead of dead-end empty messages.

## Mobile navigation

The mobile bottom navigation no longer assumes exactly five items.

It is horizontally resilient so Customers and future app sections do not break layout on narrow devices.

## Public date correctness

Public preferred dates use the store organization timezone rather than the visitor device UTC date.

The public store payload now exposes its configured timezone.

## Legal localization

Privacy and Terms content is rendered through PT / EN / ES translations instead of hard-coded Portuguese.

## Guardrails

This workflow does not:

- fabricate consent;
- store plaintext tracking tokens;
- permit hidden status jumps;
- bypass schedule collision checks;
- accept inconsistent payment state;
- publish incomplete catalogs;
- invent service revenue.

## Definition of done for this phase

- real onboarding data
- server-side publish readiness
- internal request intake
- manual quote
- secure customer link
- explicit lifecycle
- schedule flow
- execution/payment flow
- customer screen
- actionable empty states
- mobile navigation fix
- public timezone correctness
- legal localization
- automated regression tests
- production smoke markers
