# Deployment Checklist — v1.17.4-R2

## Before installation

- Confirm the target application version is `1.17.4`.
- Confirm migration `047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql` exists.
- Confirm v1.17.4-R1 Staff source is present.
- Keep a clean Git working tree or review local changes before installation.

## Install

1. Extract the R2 repair ZIP to a fresh folder.
2. Run `START-HERE-WINDOWS.bat`.
3. Review the rollback-backup path printed by the installer.
4. Review `git status` and `git diff`.
5. Commit with: `v1.17.4-R2 regression contract stabilization`.
6. Push and require the full GitHub CI workflow to pass.

## CI acceptance

Require all existing backend suites plus `test:v1174r2` to pass. In particular, Human Support should report 26/26 and R2 should report 15/15.

Do not deploy merely because the local source-only checks pass. GitHub CI must still run dependency installation, security checks, audits, frontend typechecks/builds, and PostgreSQL integration.

## Database

Do not create or alter a migration for this hotfix. Migration `047` remains current. Next migration: `048`.
