# Production Readiness — Authentication & Access

## Objective

Make direct NestLocal entry reliable and keep authorization behavior aligned with the MillionsNest canonical app-access contract.

## Direct Google entry

NestLocal uses the canonical Firebase Auth helper domain:

`millionsnest.firebaseapp.com`

The custom NestLocal domain remains an authorized origin, but is not used as the Firebase Auth helper domain.

Reason:

- the MillionsNest Hub already standardizes the canonical helper domain;
- popup auth is less fragile across browser privacy/storage policies than custom-domain redirect auth;
- direct NestLocal login must not depend on a Hub cookie.

## Login strategy

Primary:

1. set browser-local Firebase persistence;
2. open Google with `signInWithPopup`;
3. resolve canonical NestLocal session from the NestLocal backend.

Fallback:

- if popup is blocked or unsupported, use `signInWithRedirect`.

A user closing the popup is treated as a cancelled login, not as an infrastructure failure.

## Hub handoff

Short-lived Hub handoff remains supported.

Before consuming the custom token NestLocal explicitly selects local browser persistence.

Handoff and direct Google login converge on the same server-side authorization contract.

## Session recovery

Authentication and application session are separate UI states.

If Google identity succeeds but `/api/session` fails:

- NestLocal does not pretend that the user has zero organizations;
- it shows a dedicated recovery surface;
- the user can retry the session;
- switch Google accounts;
- open MillionsNest for recovery.

Known raw internal error codes are not the primary user-facing copy.

## Organization selection

After session resolution:

- the remembered organization is used only if it is still eligible;
- otherwise the first eligible organization is selected;
- only when no eligible organization exists does NestLocal display the appropriate access/billing recovery state.

This prevents a stale `nl_org` preference from trapping a user behind an inaccessible tenant.

## Canonical access parity

The NestLocal server now mirrors the Hub resolver gates.

For non-global users all of the following are required:

1. active user;
2. active organization;
3. canonical membership at `organizations/{orgId}/members/{uid}`;
4. active/trialing NestLocal subscription;
5. active/trialing organization NestLocal app projection;
6. owner role OR explicit `appAccess.nestlocal.enabled`;
7. owner role OR `nestlocal.manage` permission.

## Global roles

Canonical/legacy global roles retain administrative access:

- ceo
- global_admin
- ecosystem_owner
- founder
- admin (legacy compatibility)

They do not depend on local membership or NestLocal subscription.

## Access reasons

The session projection exposes the authorization reason for inaccessible organizations, including:

- SUBSCRIPTION_NOT_FOUND
- SUBSCRIPTION_PAYMENT_REQUIRED
- SUBSCRIPTION_INACTIVE
- ENTITLEMENT_INACTIVE
- MEMBERSHIP_NOT_FOUND
- MEMBERSHIP_INACTIVE
- MEMBER_APP_ACCESS_DISABLED
- PERMISSION_DENIED

The UI maps these to billing or access-recovery surfaces instead of always showing plan cards.

## Bootstrap

NestLocal bootstrap no longer duplicates an `enabledApps` gate.

The authenticated `authorize` middleware is the canonical application access boundary.

## Public storefront

Public availability requires both:

- an active/trialing NestLocal subscription;
- an active/trialing organization NestLocal app projection.

This prevents the public store from remaining active when the canonical app entitlement is inactive.

## Languages

Login and recovery states are available in PT / EN / ES.

## Definition of done for this phase

- canonical Firebase helper domain
- popup-first Google login
- redirect fallback
- local persistence
- Hub handoff preserved
- session failure UI
- switch-account recovery
- eligible-org preference repair
- server/Hub access parity
- global-admin bypass preserved
- public entitlement parity
- automated regression coverage
- production smoke markers
