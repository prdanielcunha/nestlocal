# AGENTS.md — NestLocal

## Repository discipline

Read the real code, tests, deployment configuration and current product docs before changing behavior. Prefer small reversible changes, preserve server-side authorization, multi-tenancy and production behavior, and do not introduce secrets or privileged client-side bypasses.

## Canonical app entry and authentication

The ecosystem-wide source of truth is `prdanielcunha/millionsnest/docs/ECOSYSTEM_APP_ENTRY_AUTH_STANDARD.md`.

Permanent rule: NestLocal must be usable from its own domain/PWA without requiring a manual Hub round-trip just to restore authentication. When unauthenticated it must offer product-native Google entry while Hub launch/handoff remains supported where applicable.

Google/Firebase authenticates identity only. MillionsNest canonical organization, membership, entitlement and RBAC data authorizes access. Never use client-provided organization IDs, local/session storage, e-mail, UID aliases or UI roles as authorization. Direct entry and Hub entry must converge on the same authorization truth, support wrong-account recovery, multi-organization handling, safe return paths and PT/EN/ES.

Current conformance: NestLocal already provides native Google entry. Its API authorization must remain server-side, organization-scoped and entitlement-aware.

## Initial zero-cost policy

Owner decision, 2026-10-18: the project starts with zero cost. Do not provision or enable services/features that introduce new charges. Managed backups, paid restore drills and other paid additions are deferred until the project earns a profit and the owner explicitly approves their costs. Profit alone is not authorization. Keep these items in the administrator's future improvements plan; do not auto-activate them or repeatedly request activation while this policy remains in force. Preserve existing ecosystem resources, user data, access and subscriptions; this policy does not authorize disabling or deleting shared infrastructure.
