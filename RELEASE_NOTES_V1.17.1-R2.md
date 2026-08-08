# Release Notes — v1.17.1-r2

**Release:** Backend Dependency Audit Security Hotfix  
**Runtime version:** `1.17.1`  
**Migration:** unchanged at `044`  

## Fixed

GitHub Actions reached the final backend `npm audit --audit-level=high` gate and failed because `postcss` had resolved the compatible transitive dependency `nanoid` to vulnerable version `3.3.16`.

The hotfix pins `nanoid` to patched `3.3.17` through `backend-api/package.json` overrides and updates `backend-api/package-lock.json` to the official npm registry artifact with SHA-512 integrity.

## Added

`test:v1171r2` validates that the vulnerable dependency cannot silently return in a future lockfile. Both CI workflows run this contract check before the live npm audit.

## Unchanged

Dynamic CORS, Domain Mapping, Human Support, SSE, AI runtime, attachments, database schema, migration `044`, and all production API contracts remain unchanged.
