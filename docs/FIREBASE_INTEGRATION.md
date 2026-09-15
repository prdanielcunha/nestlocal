# Shared Firebase integration

User decision: NestLocal uses the existing `millionsnest` Firebase project.

Verified in the Hub repository: shared Firebase Auth and Firestore; Hosting target
`hub` maps to `mn-hub-555464791734`; Hub API service is `millionsnest-api`.
NestLocal is currently listed as coming soon and has no destinations in the Hub
app experience registry. A working NestLocal handoff is not established by that listing.

This repository declares a separate Hosting target `nestlocal`. It intentionally
has no site binding until authenticated inspection identifies or creates its site.
Do not bind it to the Hub or another app's site. Deploy only `hosting:nestlocal`.
The first static pilot is served from `web`. It demonstrates the complete intake
and operational workspace without writing customer data to the shared database.

Do not deploy Firestore or Storage rules from this repository into the shared
project. Integrate required rules in their owning repository with tenancy tests.
Do not invent Hub API routes or redirect `/api/**` to the Hub before contracts exist.

The Hub uses GitHub OIDC federation with a deployer service account. That existing
configuration does not prove that the new NestLocal repository is authorized.
Do not transfer credentials from Hub jobs or broaden IAM silently.

Next requirements: verified NestLocal access contract; app implementation;
authenticated Hosting site inspection; scoped deployment authorization; end-to-end
verification and production release. Shared identity and billing remain in the Hub.

Session verification: local Git works and domain tests pass. No Firebase/Google
Cloud credential was configured in task environment variables. Firebase Console
access returned HTTP 502 with connection refused from the cloud browser.
