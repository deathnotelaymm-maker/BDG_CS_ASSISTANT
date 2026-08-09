# Deployment Checklist — v1.17.4-R1

## Before installation

- [ ] Use the repository intended for the v1.17.4 release.
- [ ] Confirm `backend-api/package.json` is version `1.17.4`.
- [ ] Confirm `backend-api/migrations/047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql` exists.
- [ ] Commit/stash unrelated local changes before applying R1.
- [ ] Do not edit migration `047`.

## Install and review

- [ ] Extract the R1 repair ZIP into a fresh folder.
- [ ] Run `START-HERE-WINDOWS.bat` or the versioned installer.
- [ ] Confirm payload SHA-256 verification passes.
- [ ] Confirm a changed-file rollback backup is created.
- [ ] Confirm installed-file SHA-256 verification passes.
- [ ] Confirm `test:v1161`, `test:v1173`, `test:v1174`, and `test:v1174r1` pass.
- [ ] Review `git status --short` and `git diff`.

## CI and production

- [ ] Commit with `v1.17.4-R1 CI source synchronization hotfix`.
- [ ] Push only after reviewing the changed Staff and CI files.
- [ ] Require normal CI to pass, including dependency install, backend suites, frontend typechecks/builds, audit, and integration tests.
- [ ] Require the production-release workflow to pass.
- [ ] No new database migration is required for R1.
- [ ] Keep `048` as the next migration number.
