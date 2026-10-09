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

## Not delivered / blocked by proof

- F0: **No live Firestore backup, Stripe webhook certification, Cloud Run/Hosting SHA audit, nor account-by-account MusicScale regression was executed in this code-only change.** These are release prerequisites.
- F1: Hub no-card trial and billing changes require controlled work on the separate Hub repo; no Stripe or Hub mutation is included here.
- F3–F6: Universal NestAI/multimodal, credit ledger, durable reminders/push/Calendar OAuth and official Connect are **not** enabled by these routes.
- F7–F8: Pilot 5–10 real companies, unit economics, moderation, and Founders launch not executed.
- Existing commercial request caps are controlled by `NESTLOCAL_FAIR_USE_V2_ENABLED`; turning this on after review avoids artificial caps while abuse limits remain. Do not advertise pricing/AI quotas before measured.
- No deployment, web push notification, WhatsApp transmission, or revenue attribution is asserted.

## Rollback

Disable the opportunity flags first. This instantly restores the existing UX/API without deleting private drafts. Revert this branch/PR if necessary. Never remove draft collections during rollback; no other ecosystem collection is modified by this branch.
