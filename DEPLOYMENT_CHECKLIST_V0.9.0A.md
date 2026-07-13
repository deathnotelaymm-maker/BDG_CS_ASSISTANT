# v0.9.0a Deployment Checklist

1. Keep the working v0.9.0 project as `ProjectRoot`.
2. Download the v0.9.0a patch ZIP and scripts ZIP.
3. Run `APPLY-PATCH-V0.9.0A-WINDOWS.ps1`; confirm all 34 backend tests and the Admin build pass.
4. Confirm the printed backup path exists.
5. Run `DEPLOY-V0.9.0A-PRODUCTION-WINDOWS.ps1` only when ready to publish.
6. Confirm GitHub push succeeds.
7. Confirm Render reports `0.9.0a-reliable-r2-image-upload-diagnostics-hotfix`.
8. Confirm `/health/dependencies` reports `r2: ok`.
9. Confirm Admin Pages production deployment uses branch `production`.
10. Open Admin in an Incognito window and log in again.
11. Upload a small PNG from AI Prompt & Image.
12. Upload a small PNG as a Category custom icon.
13. Open each returned image URL and confirm HTTP 200 with an image content type.
14. Confirm Render has no new `x-amz-decoded-content-length` errors.

No Render environment changes and no database migration are required.
