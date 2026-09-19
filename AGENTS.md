# AGENTS.md — NestLocal

## Repository discipline

Read the real code, tests, deployment configuration and current product docs before changing behavior. Prefer small reversible changes, preserve server-side authorization, multi-tenancy and production behavior, and do not introduce secrets or privileged client-side bypasses.

## Canonical app entry and authentication

The ecosystem-wide source of truth is `prdanielcunha/millionsnest/docs/ECOSYSTEM_APP_ENTRY_AUTH_STANDARD.md`.

Permanent rule: NestLocal must be usable from its own domain/PWA without requiring a manual Hub round-trip just to restore authentication. When unauthenticated it must offer product-native Google entry while Hub launch/handoff remains supported where applicable.

Google/Firebase authenticates identity only. MillionsNest canonical organization, membership, entitlement and RBAC data authorizes access. Never use client-provided organization IDs, local/session storage, e-mail, UID aliases or UI roles as authorization. Direct entry and Hub entry must converge on the same authorization truth, support wrong-account recovery, multi-organization handling, safe return paths and PT/EN/ES.

Current conformance: NestLocal already provides native Google entry. Its API authorization must remain server-side, organization-scoped and entitlement-aware.
