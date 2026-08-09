# v1.17.4-R3 Deployment Checklist

1. Install R3 over a complete v1.17.4-R2 repository.
2. Confirm the installer creates a changed-file rollback backup.
3. Review `git diff` and the four frontend lockfiles.
4. Run/push GitHub CI. Require all frontend `npm ci`, typecheck, build, and `npm audit --audit-level=high` stages to pass.
5. No database migration is required. Do not edit or re-run migration 047 for this repair.
6. Deploy only after CI is green.
7. Recommended commit: `v1.17.4-R3 frontend dependency security repair`.
