# Test Result — v1.17.4-R2

## Source and carry-forward checks

- Backend JavaScript syntax: PASS.
- Main regression: 62/62 PASS.
- Prompt Runtime: 5/5 PASS.
- Simplified AI: 5/5 PASS.
- Human Support foundation with the current identity contract: 26/26 PASS (local import path exercised with a temporary sanitizer dependency stub only; stub removed before packaging).
- v1.16.1 realtime AI worker: 29/29 PASS.
- v1.16.2 conversation continuity: 39/39 PASS.
- v1.16.3 Admin/chat/theme: 13/13 PASS.
- v1.16.4 SSE delivery: 16/16 PASS.
- v1.17.0 professional support workspace: 30/30 PASS.
- v1.17.1 dynamic CORS: 25/25 PASS.
- v1.17.2 shared hosting: 28/28 PASS.
- v1.17.2-R2 integration-origin contract: 9/9 PASS.
- v1.17.3 workspace UX: 35/35 PASS.
- v1.17.4 feature regression: 47/47 PASS.
- v1.17.4-R1 source-sync guard: 12/12 PASS.
- v1.17.4-R2 regression-contract guard: 15/15 PASS.
- AI response reliability: 6/6 PASS.

## Important verification boundary

A full local `npm ci` could not be completed in this environment. The security suite was deliberately not claimed because its sanitizer behavior requires the real `sanitize-html` dependency; a temporary stub used to exercise the Human Support import path would invalidate that security test. Structured/upload/integration and frontend dependency-backed builds are therefore left to GitHub CI.

The temporary `node_modules` test stub is excluded from both release archives.

## Release package verification

- Repair payload hash verification: 25/25 PASS.
- Dry install over the v1.17.4-R1 complete source: 25/25 installed-file hashes PASS.
- Dry-installed v1.17.3 carry-forward regression: 35/35 PASS.
- Dry-installed v1.17.4 feature regression: 47/47 PASS.
- Dry-installed v1.17.4-R1 source-sync guard: 12/12 PASS.
- Dry-installed v1.17.4-R2 contract guard: 15/15 PASS.
- Complete-source inventory verification: 980/980 PASS before final report refresh.
- Repair ZIP integrity: PASS.
- Complete-source ZIP integrity: PASS.
- Repair payload versus complete source: 25/25 PASS.
- Forbidden `node_modules`, `.git`, and raw `.env` archive entries: 0.
