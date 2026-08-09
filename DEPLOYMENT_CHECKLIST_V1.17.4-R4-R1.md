# Deployment Checklist — v1.17.4-R4-R1

- [ ] Extract the repair ZIP into a fresh folder.
- [ ] Run `START-HERE-WINDOWS.bat`.
- [ ] Confirm target verification passes on Windows PowerShell 5.1.
- [ ] Confirm installer creates a rollback backup.
- [ ] Confirm R4/R3/R2 and Customer Service checks pass locally when Node.js is available.
- [ ] Review `git status` and `git diff`.
- [ ] Confirm migration 047 is unchanged; do not create/apply migration 048.
- [ ] Commit: `v1.17.4-R4-R1 Windows installer compatibility hotfix`.
- [ ] Push and require full GitHub CI.
- [ ] Require Admin `npm ci`, Customer Service regression, `tsc --noEmit`, Vite build and `npm audit` to pass.
- [ ] Deploy only after all production-release gates are green.
