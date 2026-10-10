# F0 — MusicScale release safety fingerprint (read-only)

This script allows a **trusted operator** to compare organization membership, MusicScale paid projections and schedule collections before and after a NestLocal migration.

It **never writes** to Firestore. The only file output is a local HMAC snapshot with document counts and digests, not raw names, customer contacts, billing IDs or schedules. A secret audit salt prevents trivial hash guessing. The snapshot is created with mode `0600`; do not check it into Git.

Requires Node 24, installed dependencies, Firebase Admin ADC scoped to the correct project, `FIREBASE_PROJECT_ID`, and an externally supplied `NESTLOCAL_AUDIT_SALT` of at least 16 characters. The tool cannot validate whether ADC has the right production privileges; configure an audited read-only IAM principal.

```bash
# Never paste credentials or the salt into chat or commits.
FIREBASE_PROJECT_ID=YOUR_PROJECT NESTLOCAL_AUDIT_SALT=FROM_SECRET_MANAGER \
  node scripts/nestlocal-release-snapshot.mjs --capture /secure/nestlocal-before.json --orgs org_1,org_2

# After staged deployment, with the SAME secret salt and project:
FIREBASE_PROJECT_ID=YOUR_PROJECT NESTLOCAL_AUDIT_SALT=FROM_SECRET_MANAGER \
  node scripts/nestlocal-release-snapshot.mjs --compare /secure/nestlocal-before.json
```

**Release gate:** nonzero exit status means the release MUST NOT proceed until differences have been reconciled. Fingerprints include `organizations/{orgId}/members`, legacy `organization_members`, `scales`, `bandScales`, `fixedBandScales`, `apps.musicscale`, and the legacy billing projection. NestLocal's own app map is excluded from the protected fingerprint.

**Limitations:** the command only checks the explicit organization set and the known collections listed above, not every user/scale reference, Stripe invoice state, separate MusicScale schema, file storage or real end-user behavior. It is **not a backup** and cannot restore records. A real Firestore export/snapshot + restore drill and account-by-account regression remain mandatory before production launch. Run in a quiescent window to avoid reporting normal edits as release changes. No live production check was performed during this implementation.
