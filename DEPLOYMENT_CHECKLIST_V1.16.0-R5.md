# Deployment Checklist — v1.16.0-r5

1. Close every r4 installer window.
2. Keep the rollback backups until production verification is complete.
3. Extract r5 into a new folder and run `START-HERE-WINDOWS.bat`.
4. Confirm installed-file SHA-256 verification passes.
5. Confirm the Customer Service route regression test passes.
6. Review Git changes in GitHub Desktop.
7. Commit: `v1.16.0-r5 Fix Customer Service installed-state verifier`.
8. Push and wait for the complete production workflow.
9. Confirm Admin typecheck and build pass.
10. Hard-refresh `/admin/customer-service` and test the route.
11. Keep migration `038` unchanged; the next migration remains `039`.
