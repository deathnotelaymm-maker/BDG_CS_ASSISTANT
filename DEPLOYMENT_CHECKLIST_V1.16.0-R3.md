# Deployment Checklist — v1.16.0-r3

1. Confirm the repository already contains v1.16.0 Human Support Foundation.
2. Extract the r3 repair ZIP.
3. Run `START-HERE-WINDOWS.bat`.
4. Review the five application/workflow changes plus release documentation.
5. Commit: `v1.16.0-r3 Fix Customer Service route crash`.
6. Push to `main`.
7. Confirm GitHub Actions passes:
   - Customer Service route regression
   - Admin typecheck
   - Admin production build
8. Confirm Cloudflare publishes the new Admin release.
9. Hard-refresh the Admin page or open a private window.
10. Open `/admin/customer-service` and confirm the Overview tab renders.
11. Open a conversation and confirm the Drawer renders its timeline.
12. Confirm no database migration runs; migration 038 remains unchanged.
