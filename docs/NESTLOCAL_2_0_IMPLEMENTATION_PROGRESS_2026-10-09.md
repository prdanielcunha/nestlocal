# NestLocal 2.0 — staged migration, implementation ledger

Date: 2026-10-09. Source: audit and plan dated 2026-10-08.

## Scope delivered in this branch

- **F2 / capture foundation:** new tenant-scoped `nestlocal_opportunity_drafts` collection. No changes to existing requests, customers, scheduling, subscription documents, or MusicScale records.
- **P0 authorization:** `authenticate` and `authorize` already enforce canonical Hub org/membership/entitlement. Every new route uses those middlewares; no client-defined tenant or flag.
- **Idempotency:** creation uses a deterministic ID derived from authenticated org, user and the required `Idempotency-Key`. Reusing the same key for different content returns 409. Updates require `expectedVersion`; repeated update keys do not duplicate writes.
- **LGPD-sensitive audit:** logs in `organizations/{orgId}/nestlocal_audit` contain only action, draft identifier, actor UID, timestamp and schema version, no customer message or contact.
- **Product truth:** manual WhatsApp/Instagram/telephone input only; no WhatsApp connection, auto-send, automatic quote, purchase, or conversion. Partial information is never inserted into `nestlocal_requests`.
- **UI:** PT/EN/ES first-action capture; four primary mobile tabs and a contextual More menu; three-question Today layout with older operations retained behind full dashboard; opportunity drafts visible in Opportunities.
- **Explicit conversion:** an operator can choose *Complete request*, fill the existing validated order form, and atomically promote an open draft to one service order, preserving usage counters, financial validation and an audit event. A deterministic destination ID prevents a duplicate request on retries. No automatic promotion from imported text.
- **Isolation:** new UX/API is disabled by default, tenant-scoped and reversible.

## Flags and release procedure

Server env:
```txt
NESTLOCAL_OPPORTUNITY_DRAFTS_V2_ENABLED=false
NESTLOCAL_OPPORTUNITY_DRAFTS_V2_PILOT_ORGS=org-id-for-approved-pilot
```
The global boolean is an explicit alternative to the organization allowlist. Do not set it to true for all tenants until the pilot gates pass. Never send these flags from the browser.

**Pre-release:** run `npm run check`; review the PR; compare production release SHAs; take verified Firestore snapshots using authorized operational tooling before performing migrations; verify rollback to the current production image. Existing schema remains readable and no migration is required for this branch.

**Manual pilot checks:**
1. Existing MusicScale paid accounts: unchanged Stripe customer/subscription IDs, roles/functions, fixed-band schedules, invitations, and ability to open MusicScale.
2. NestLocal direct/Hub login, wrong-account handling, organization switching, all client forms and published pages.
3. Pilot org: save partial WhatsApp text, list, edit via API, archive, retry same idempotency key, reject stale version; complete a draft into exactly one request; verify that invalid incomplete request fields cannot convert; confirm second org cannot access its draft.
4. Nonpilot org: existing Home, requests and performance are unchanged; the opportunity draft API returns 404.
5. Expired trial: GET draft allowed while mutation is rejected by `authorize`; no public page accepts operations for an expired trial once the Hub flag is certified.
6. 390px iPhone / Android / desktop and PT/EN/ES; no modal or menu clipping, no loading loop; manual text remains private.
7. Always test GET before enabling a pilot flag and monitor server error rate.

## Additional increments in this continuation

- **F3 foundation:** `GET /opportunity-drafts/:draftId/preview` returns source-grounded, *deterministic* facts, up to three confirmation questions and an editable/manual reply. There is **no remote NestAI call or credit consumption** in this preliminary feature; no claim of AI reasoning or notification delivery.
- **F5 manual follow-up tasks:** organization-scoped `nestlocal_action_tasks` with source-draft validation, owner UID, server audit, per-actor idempotency, optimistic update versions and in-app scheduling with operator-selected date/time and IANA timezone. Nothing auto-sends or queues push/email.
- **F5 opt-in calendar export:** a separate `.ics` for each dated task. Export includes generic NestLocal content only, not customer information, and one-hour pre-event `VALARM`. Calendars/operating systems may ignore alarm instructions. No bidirectional sync or guaranteed phone notifications.
- **F1 data portability:** authenticated managing members can page through scoped requests, customers, services, drafts and tasks, including when the existing Hub internal trial is read-only. Public tracking/review token hashes are omitted. The read-only banner offers a user-triggered JSON export with an explicit safety warning. Export is bounded at 100 records/page, with a browser fail-closed limit of 5,000 records per dataset.
- All additional features are additive. The same **opportunity pilot flag remains OFF** unless explicitly enabled by server-side allowlist. Data export is read-only, protected by the existing organization authorization and manager rights.

- **F0 read-only release guard:** operator-only `scripts/nestlocal-release-snapshot.mjs` captures salted HMAC summaries of protected paid MusicScale projections, canonical/legacy memberships and fixed-band scale collections. The comparison tool uses read-only Firebase Admin ADC, needs explicit org selection and secret salt, and **has not run against production**. See `docs/NESTLOCAL_2_0_RELEASE_SAFETY_SNAPSHOT.md`. It is not a Firestore backup or a complete user workflow test.
- **Delivery safety:** the new UI module and stylesheet have a fresh build asset version to avoid PWA cache staleness. CI cancels obsolete PR runs to reduce cost.

**Security/release clarifications:** In-app tasks are not durable scheduled push delivery. All Copilot text is rule-generated. The pre-existing Hub internal trial/credit-outbox pipeline was inspected in source only; it was not enabled or live-tested. This does not complete F0/F1/F3/F5 until their infrastructure and product gates pass.

## Continuation — consented NestAI and active-app reminders

- **F3 official NestAI extraction:** reuses the already registered `nestlocal.request.extract` task via `@millionsnest/ai` and the Hub-issued scoped token; no provider/model hardcoded in NestLocal. Only tenant-stored manual source text is considered, and the model receives at most 2,500 characters with common direct identifiers redacted. Price/schedule/send authority is always false. Extracted service is shown only if it occurs in the provided source and remains **unverified** until an operator confirms. No automatic write to requests, messages or appointments.
- **Explicit operator authorization:** the pilot UI requires a per-request checkbox before a NestAI call. Server requires `consentToProcessMessage:true` and persists metadata-only authorization evidence in the existing tenant audit collection, in the same transaction that reserves the AI request budget. No raw messages or identifiers are copied to audit.
- **Strict rollout gates:** `NESTLOCAL_OPPORTUNITY_AI_V2_ENABLED=true` **and** `NESTLOCAL_AI_V2_ENABLED=true` **and** `NESTLOCAL_OPPORTUNITY_AI_PILOT_ORGS=<org-id>` **and** the opportunity-drafts flag/allowlist. All are OFF unless set server-side. `NESTLOCAL_OPPORTUNITY_AI_DAILY_CAP=8` controls daily UTC calls per organization, capped by code to 1–25. Errors and exhausted quota retain the manual preview; even failed provider attempts use one budget unit to prevent cost amplification. Hub/NestAI quotas are an additional control.
- **F5 device reminders while open:** tenant-specific, user-opt-in Notification API shows only aggregate counts of overdue/today/tomorrow tasks. Deduplication uses a local device marker and permission can be denied. Triggers happen on app load, returning to visible tab and every 15 minutes while open. **This is NOT background push**, has no guarantee of delivery, and is not a substitute for calendar reminders or server-side scheduled FCM/Push.
- **Browser tests:** synthetic mobile/desktop flow includes deliberate NestAI consent, mocked task, source-grounded extraction and all previous stages; no real provider, Stripe or Firestore instance is represented by the browser mock.

These improvements are additive to the #113 draft PR and do not constitute activation or rollout. The full F3 certification still needs live AI router permissions, provider quotas, redaction review and sample prompt-injection evaluation. The full F5 requires background push, delivery/receipt audit and opt-in service-worker/app configuration.

## Not delivered / blocked by proof

- F0: **No live Firestore backup, Stripe webhook certification, Cloud Run/Hosting SHA audit, nor account-by-account MusicScale regression was executed in this code-only change.** These are release prerequisites.
- F1: Hub no-card trial and billing changes require controlled work on the separate Hub repo; no Stripe or Hub mutation is included here.
- F3–F6: Universal NestAI/multimodal, credit ledger, durable reminders/push/Calendar OAuth and official Connect are **not** enabled by these routes.
- F7–F8: Pilot 5–10 real companies, unit economics, moderation, and Founders launch not executed.
- Existing commercial request caps are controlled by `NESTLOCAL_FAIR_USE_V2_ENABLED`; turning this on after review avoids artificial caps while abuse limits remain. Do not advertise pricing/AI quotas before measured.
- No deployment, web push notification, WhatsApp transmission, or revenue attribution is asserted.

## Rollback

Disable the opportunity flags first. This instantly restores the existing UX/API without deleting private drafts. Revert this branch/PR if necessary. Never remove draft collections during rollback; no other ecosystem collection is modified by this branch.
