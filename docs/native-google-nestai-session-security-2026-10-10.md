# NestLocal 2.0 — direct Google identity → NestAI (10 Oct 2026)

## Defect closed
The direct Google sign-in introduced in PR #118 could correctly access regular server routes
but NestAI's existing Hub token-exchange contract accepts only an opaque `nl_` application
session. Native Firebase ID tokens intentionally are not accepted by that exchange.

## Production-safe solution
- `POST /api/auth/firebase/session` requires a verified Firebase ID token (no anonymous
  or existing `nl_` bearer allowed).
- `organizationId` is a **proposed target only**. The server reads canonical user,
  organization, member, NestLocal subscription and internal-trial records, then calls
  the existing `resolveNestLocalAccess` decision. It returns 403 unless authorized.
- The newly issued `nl_` token uses the existing 12h NestLocal session TTL, hashed
  Firestore document key, server-side session-version validation and first-party
  HttpOnly Secure cookie. The raw value is *never* saved in customer data or logs.
- The app continues to use the Firebase identity for its private API and organization
  chooser; a separate `nl_` token is reserved for the Hub/NestAI exchange.
- On every organization switch a new native application session is requested.
- Every NestAI server entry point revalidates that the presented application session
  matches both the **currently authenticated UID** and the **authorized org ID**.
  Old cookies from another Google account or another organization cannot be reused.
- Missing exchange fails closed for premium AI; manual opportunity review, orders
  and the ordinary app remain available.
- Hub-issued single-use handoffs and existing paid sessions are unchanged.

## Regression and limits
- Automated unit contract checks cover canonical gates, first-party cookie issuance,
  tenant/UID verification and UI organization switching.
- Existing browser suites cover 320/390/1440px and the staged NestLocal flows.
- Live Google popup, real Hub NestAI token exchange, provider quota, AI results and
  Firestore account migration remain **manual acceptance gates**, not simulated
  successes. No pricing, Stripe, MusicScale roles/data or Firestore migration changed.

## Operator checks
1. Open https://nestlocal.millionsnest.com in a fresh tab and sign in with Google.
2. Confirm requested organization is accessible and that operations load.
3. In an approved pilot organization, enable the existing NestAI server-side flags
   and consent to one real opportunity extraction; verify no external message is sent.
4. Change Google accounts and organizations; verify previous organization AI
   context is never exposed, including on page reload and installed PWA.
5. In an expired trial, verify read-only information/export and rejection of
   the AI and order-writing paths.
6. Track actual NestAI credits in the canonical Hub ledger before declaring
   the full F3 requirement complete.
