# v1.17.4-R1 — CI / Source Synchronization Hotfix

## Release identity

- Application version: `1.17.4`
- Package revision: `R1`
- Base: final v1.17.4 source
- Runtime release marker: `1.17.4-cs-identity-domain-promotion-menu-upgrade` (unchanged)
- Database migration: `047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql` (unchanged)
- Next migration: `048`

## Why this repair exists

The reported GitHub CI run installed dependencies successfully and passed the main regression, Prompt Runtime, Simplified AI, and Human Support suites, then stopped in the legacy `test:v1161` carry-forward suite at the single combined Staff workspace assertion. The final v1.17.4 release source contains every marker required by that assertion, which points to a partial/stale source application rather than a database or dependency failure.

## Repair

R1 deliberately stays narrow:

- Re-applies the authoritative final-v1.17.4 `staff-pro/src/App.tsx`.
- Re-applies the authoritative final-v1.17.4 `staff-pro/src/api.ts`.
- Preserves authenticated Staff/Admin SSE, real SSE-frame parsing, and HTTP sequence catch-up.
- Splits the old opaque Staff workspace assertion into explicit marker checks so a future CI failure names the exact missing capability.
- Adds `test:v1174r1`, a semantic source-sync guard for the Staff workspace and realtime path.
- Adds that guard to normal CI and the production-release workflow.
- Adds a rollback-capable Windows installer, target/payload/installed verification, manifest, checksums, and deployment notes.

## Not changed

- No database migration is added or edited.
- No runtime API contract is intentionally changed.
- No v1.17.4 Chat, Domain Mapping, profile, promotion, or Chat Menu feature is removed.
- Application package versions remain `1.17.4`; `R1` is a release-package revision.

## Recommended commit

`v1.17.4-R1 CI source synchronization hotfix`
