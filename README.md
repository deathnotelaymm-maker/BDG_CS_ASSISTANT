# v1.17.4-R2 — Regression Contract Stabilization

v1.17.4-R2 is a narrow CI/test-contract repair for the v1.17.4 application. It does **not** change customer-facing product behavior, application semver, database schema, or migration sequence.

**Application version:** `1.17.4`  
**Package revision:** `R2`  
**Base:** `v1.17.4-R1`  
**Runtime release marker:** `1.17.4-cs-identity-domain-promotion-menu-upgrade` (unchanged)  
**Current migration:** `047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql` (unchanged)  
**Next migration:** `048`

## Purpose

GitHub CI correctly installed dependencies and passed the main, Prompt Runtime, Simplified AI, and the first Human Support checks. It then failed because the legacy Human Support foundation still asserted the obsolete UI title `Luke Support Workspace`, while the production v1.17.4 Staff application intentionally uses `Luke CS Workspace`.

R2 updates that stale test contract, separates identity/queue/login checks for clearer diagnostics, audits the current support-facing regression scripts for the obsolete positive assertion, and adds a dedicated `test:v1174r2` guard to normal and production CI.

## R2 changes

- Replaces the obsolete `Luke Support Workspace` Human Support assertion with the current `Luke CS Workspace` identity contract.
- Verifies Team queue availability separately from workspace branding.
- Verifies Staff and Administrator login modes separately.
- Adds `test:v1174r2` to guard against reintroducing obsolete positive UI assertions.
- Wires the R2 guard into normal CI and production-release CI.
- Preserves all v1.17.4 product functionality and migration `047`.

## Database

No migration is added or modified. Migration `047` remains current and `048` remains the next migration number.


## v1.17.4-R3

Current repair package: **Frontend Dependency Security Repair**. It patches the frontend lockfile advisories and fixes the Windows START-HERE installer path/visibility issue. See `RELEASE_NOTES_V1.17.4-R3.md`.


## v1.17.4-R3

Current repair package: **Frontend Dependency Security Repair**. It patches the frontend lockfile advisories and fixes the Windows START-HERE installer path/visibility issue. See `RELEASE_NOTES_V1.17.4-R3.md`.
