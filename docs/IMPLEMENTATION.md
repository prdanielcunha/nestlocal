# Implementation and release gates

## Current delivery
Server-side pure quote domain, synthetic test fixtures and CI. No production deployment, user-facing application, database or payment integration is included yet. The module is not a public API.

## Scope
Pilot: residential split cleaning and technical visits with technician-approved prices. Installation, repairs, unsupported equipment and uncertain access require review. Outside coverage cannot be priced. No inferred diagnosis or price from AI. Time and money remain separate from reservation and payment states.

## Build sequence
1. Confirm the existing MillionsNest identity, organization membership, roles and subscription contracts from code and an authenticated environment. Do not invent endpoints or duplicate billing.
2. Add authenticated server handlers. Derive organization from trusted routing and authorization; load published catalog on server. Validate input sizes. Rate-limit public requests. Never trust organizationId or prices from customer JSON.
3. Persist versioned catalogs and immutable quotes; create idempotent requests and scoped public tracking credentials. Prevent cross-organization reads and writes. Test denied access with Firebase emulators.
4. Build mobile-first PT/EN/ES surfaces: onboarding, catalog editor, conditional intake, coverage, photos, quote summary, requested schedule, request tracking; technician overview, inbox, request detail, calendar, service rules, page preview, settings.
5. Add atomic slot locks, expiry and explicit confirmation. Requested time does not mean confirmed booking. Separate operational, reservation and payment status.
6. Configure restricted uploads, deletion/retention policy, sender identity, notifications, retry queue and audit events. No message is sent merely by opening a WhatsApp link.
7. Integrate hosted checkout after identity and payment ownership are verified. Verify signed webhooks, deduplicate events and reconcile failure/refund states.
8. Connect Firebase project and hosting target; create staging deployment, perform end-to-end and tenancy verification, then production release.

## Visual direction
Light canvas, dark navy navigation, restrained teal accents, strong typography, generous spacing, accessible contrast and visible keyboard focus. Mobile bottom navigation for primary tasks. All surfaces need loading, empty, error, offline and permission states. Show whether each request is priced, under review or outside coverage. Do not fabricate revenue, bookings or testimonials.

## Next acceptance gates
- Provider publishes an explicitly approved catalog and receives a working branded link.
- Customer completes intake; request persists and can be tracked without becoming an organization member.
- Out-of-coverage and unsafe/unknown access do not produce automatic prices.
- Competing reservations cannot confirm the same capacity.
- Organization A cannot inspect or mutate organization B.
- Payment is never marked paid based on a browser redirect.
- No production catalog contains test prices.
- Provider subscription remains controlled by verified Hub contracts.

## Access blocker
GitHub read/write is working. Local execution environment failed initialization in this session. No authenticated Firebase tool or project identifier is available. Credentials must be connected through the environment; never paste secrets into issues, source files or chat.

## Validation
Run npm run check with Node 24+. CI checks syntax and domain tests. Passing domain tests alone does not establish production readiness.
