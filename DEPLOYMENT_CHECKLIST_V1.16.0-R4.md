# Deployment Checklist — v1.16.0-r4

1. Close every installer window currently stopped at step 4.
2. Do not delete the rollback backups created by those attempts yet.
3. Discard the r3 repair ZIP.
4. Extract the r4 ZIP into a new folder.
5. Run `START-HERE-WINDOWS.bat` once.
6. Confirm the installer reaches the success banner.
7. Review Git changes in GitHub Desktop.
8. Commit as `v1.16.0-r4 Fix Windows installer verification hang`.
9. Push to the production branch.
10. Confirm GitHub Actions completes Admin typecheck and build.
11. Hard-refresh the Admin Customer Service route.

No database migration or Render rollback is required for r4.
