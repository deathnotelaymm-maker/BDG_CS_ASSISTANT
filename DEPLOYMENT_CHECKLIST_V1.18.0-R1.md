# Deployment Checklist — Luke CS v1.18.0-R1

1. Confirm current repository application version is `1.18.0` and Git working tree is clean.
2. Apply the exact-path R1 hotfix.
3. Review only dependency/security/CI/release-engineering changes in GitHub Desktop.
4. Run the supplied verifier; do not run a database migration.
5. Commit and push the hotfix.
6. Let GitHub CI perform fresh `npm ci`, regression tests, builds and `npm audit --audit-level=high`.
7. Do not deploy if any workspace audit still reports Nano ID below `3.3.18`.
8. Production deployment uses the existing v1.18.0 migration state; migration 048 remains latest.
9. After deployment, verify API/Chat/Admin/Staff/Guide release health and Commerce Connector test connection.
