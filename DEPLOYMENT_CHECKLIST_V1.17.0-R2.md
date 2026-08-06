# Deployment Checklist — v1.17.0-r2

1. Do not restore the failed v1.17.0 rollback backup; step 5 already verified that the 49 application payload files copied correctly.
2. Extract the r2 hotfix into a fresh local folder.
3. Run `START-HERE-WINDOWS.bat`.
4. Confirm the dependency-free v1.17.0 regression reports 30/30 passed.
5. Review Git changes.
6. Commit: `v1.17.0-r2 Fix Windows regression path resolution`.
7. Push and allow GitHub Actions to run the full dependency and PostgreSQL checks.
8. Deploy only after the complete workflow passes.

Migration 043 is unchanged and must not be edited.
