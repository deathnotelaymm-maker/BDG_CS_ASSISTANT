# Deployment Checklist — v1.15.4-r2

1. Confirm the repository already contains v1.15.4.
2. Extract the r2 repair ZIP.
3. Run `START-HERE-WINDOWS.bat`.
4. Confirm the installer reports success and shows the rollback backup path.
5. Open GitHub Desktop and review the Prompt Manager TSX diff.
6. Commit with:

   `v1.15.4-r2 Fix Admin Prompt Manager typecheck`

7. Push origin.
8. Rerun `Build and publish BDG production`.
9. Confirm `admin-pro typecheck` passes.
10. Confirm Admin production publishes and the workflow reaches release summary.
11. Open AI Prompt Manager and verify runtime cards display clipped state and runtime hash.

No migration or Render backend redeployment is required solely for this frontend type hotfix, although the normal production workflow may perform its standard release checks.
