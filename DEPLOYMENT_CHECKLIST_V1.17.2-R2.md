# Deployment Checklist — v1.17.2-r2

1. Install the r2 hotfix over v1.17.2.
2. Commit: `v1.17.2-r2 Fix Luke shared Admin integration origin contract`.
3. Push and run GitHub Actions.
4. Confirm `test:v1172r2` passes.
5. Confirm `test:integration` passes.
6. No database migration is required; migration 045 remains current.
7. No Render/Cloudflare setting change is required for this hotfix.
