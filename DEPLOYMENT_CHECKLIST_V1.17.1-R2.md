# Deployment Checklist — v1.17.1-r2

## Install

- [ ] Start from v1.17.1 (the original v1.17.1 application files may already be installed).
- [ ] Run the r2 Windows installer.
- [ ] Confirm the local regression reports 8/8.
- [ ] Commit with `v1.17.1-r2 Fix backend dependency audit security`.

## GitHub Actions

- [ ] Confirm backend `npm ci` succeeds.
- [ ] Confirm all inherited tests remain green.
- [ ] Confirm `test:v1171r2` passes.
- [ ] Confirm `npm audit --audit-level=high` exits 0.

## Production

No database migration is required. Migration `044` remains current. Deploy normally only after GitHub Actions is green.
