# Shared Firebase integration

User decision: NestLocal uses the existing `millionsnest` Firebase project.

Verified in the Hub repository: shared Firebase Auth and Firestore; Hosting target
`hub` maps to `mn-hub-555464791734`; Hub API service is `millionsnest-api`.
NestLocal is currently listed as coming soon and has no destinations in the Hub
app experience registry. A working NestLocal handoff is not established by that listing.

This repository declares a separate Hosting target `nestlocal`. It intentionally
has no site binding until authenticated inspection identifies or creates its site.
Do not bind it to the Hub or another app's site. Deploy only `hosting:nestlocal`.
The commercial pilot is served from `web` and its API runs as the isolated
`nestlocal-api` Cloud Run service. It uses the shared Firebase Authentication and
stores all business data below `organizations/{organizationId}/nestlocal_*`.

Do not deploy Firestore or Storage rules from this repository into the shared
project. Browser clients never receive direct database access; the API validates
the Firebase ID token, organization membership and NestLocal permissions.

The Hub uses GitHub OIDC federation with a deployer service account. That existing
configuration does not prove that the new NestLocal repository is authorized.
Do not transfer credentials from Hub jobs or broaden IAM silently.

Public catalogs accept qualified requests, deterministic quotes, up to five photos
and consent. The pilot uses controlled/manual activation; shared subscription
billing remains owned by the Hub and is a post-validation integration.

Session verification: local Git works and domain tests pass. No Firebase/Google
Cloud credential was configured in task environment variables. Firebase Console
access returned HTTP 502 with connection refused from the cloud browser.
