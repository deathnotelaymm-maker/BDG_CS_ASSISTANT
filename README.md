# v1.17.4-R1 — CI / Source Synchronization Hotfix

v1.17.4-R1 is a narrow packaging and CI hardening revision for the v1.17.4 application. It does **not** change application semver, database schema, or migration sequence.

**Application version:** `1.17.4`  
**Package revision:** `R1`  
**Base:** final v1.17.4 source  
**Runtime release marker:** `1.17.4-cs-identity-domain-promotion-menu-upgrade` (unchanged)  
**Current migration:** `047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql` (unchanged)  
**Next migration:** `048`

## Purpose

GitHub CI reached the legacy v1.16.1 Staff workspace assertion after dependency installation and the preceding suites passed, but the GitHub Staff source did not satisfy the same combined source contract as the final v1.17.4 package. R1 re-applies the authoritative Staff files and makes CI identify the exact missing Staff marker if source drift occurs again.

## R1 changes

- Re-applies final-v1.17.4 `staff-pro/src/App.tsx` and `staff-pro/src/api.ts`.
- Preserves authenticated Staff/Admin SSE, real SSE frame parsing, and HTTP sequence catch-up.
- Splits the old combined Staff assertion into explicit marker checks.
- Adds `test:v1174r1` and wires it into normal and production CI.
- Adds R1 manifest, checksums, rollback installer, test report, and deployment checklist.

## Database

No migration is added or modified. Migration `047` remains current and `048` remains the next migration number.
