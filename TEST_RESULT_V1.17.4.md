# Test Result — v1.17.4

## Executed in this build environment
- Backend JavaScript syntax (`npm --prefix backend-api run check`): PASS.
- Main regression: 62/62 PASS.
- Prompt Runtime: 5/5 PASS.
- Simplified AI: 5/5 PASS after updating the carry-forward release marker assertion.
- v1.16.1 realtime AI worker: 24/24 PASS.
- v1.16.3 Admin/chat/theme: 13/13 PASS.
- v1.16.4 SSE delivery: 16/16 PASS.
- v1.17.0 professional support workspace: 30/30 PASS.
- v1.17.1 Dynamic CORS: 25/25 PASS.
- v1.17.1-r2 dependency security contract: 8/8 PASS.
- v1.17.2 Luke Shared Hosting: 28/28 PASS.
- v1.17.2-r2 integration-origin contract: 9/9 PASS.
- v1.17.3 Support Workspace UX: 35/35 PASS.
- v1.17.4 CS identity/domain/promotion/menu: 47/47 PASS.
- AI response reliability: 6/6 PASS.
- TypeScript/TSX source parse: 186 files, 0 syntax errors.

## Environment-limited checks
The uploaded source contains no `node_modules`. Backend `npm ci` could not complete in this sandbox because the locked package URL for `ws@8.21.0` returned HTTP 404 from the available package gateway. A frontend dependency installation attempt also timed out. Therefore dependency-backed tests that import packages unavailable in the environment, full frontend project typechecks/Vite builds, npm audit, and PostgreSQL integration/migration execution were not claimed as local passes.

The GitHub Actions workflows are updated to include `test:v1174`; dependency installation, package audit, frontend typecheck/build, and PostgreSQL integration remain production gates.

## Repair-package validation
- Reviewed repair payload inventory: 63 files.
- Repair payload SHA-256 verification: 63/63 PASS.
- Dry-install simulation over the uploaded v1.17.3 source: 63/63 installed hashes PASS.
- Dry-installed backend JavaScript syntax: PASS.
- Dry-installed v1.17.3 carry-forward regression: 35/35 PASS.
- Dry-installed v1.17.4 regression: 47/47 PASS.
