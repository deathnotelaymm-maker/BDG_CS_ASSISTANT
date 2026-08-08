# Test Result — v1.17.2

## Passed in the build environment

- Backend JavaScript syntax (`npm run check`) — PASS
- Main regression — 62/62
- Prompt Runtime — 5/5
- Simplified AI — 5/5
- Human Support — 24/24
- v1.16.1 durable worker/realtime — 24/24
- v1.16.2 conversation continuity — 39/39
- v1.16.3 Admin/chat/theme — 13/13
- v1.16.4 SSE delivery — 16/16
- v1.17.0 professional support workspace — 30/30
- v1.17.1 verified Dynamic CORS — 25/25
- v1.17.1-r2 dependency-security guard — 8/8
- v1.17.2 Luke Shared Hosting — 28/28
- AI response reliability — 6/6
- TypeScript/TSX syntax parse — 186 files, 0 syntax errors
- Package/package-lock version alignment — PASS for backend, Admin, Chat, Guide, Staff
- GitHub workflow YAML parse — 2/2

## Release artifact verification

- Reviewed changed-file payload — 73 files
- Source release checksum list — 72/72 (checksum file excludes itself)
- Repair-package manifest/payload equality — 73/73
- Repair-package checksum verification — 93/93
- Simulated install overlay on v1.17.1-r2 — 73/73 installed hashes
- Packaged complete-source changed-file equality — 73/73
- Repair ZIP CRC integrity — PASS
- Complete-source ZIP CRC integrity — PASS
- Complete-source generated/secret folder exclusions — PASS (`node_modules`, `dist`, `.wrangler`, `.env*` absent)
- Packaged-source v1.17.2 regression — PASS
- Packaged-source v1.17.1 Dynamic CORS regression — PASS
- Packaged-source Human Support regression — PASS

## Environment-blocked checks

The packaging environment could not complete a fresh online npm dependency installation, so dependency-backed frontend typechecks/builds and the live npm audit were not rerun locally. A disposable PostgreSQL service was also unavailable, so migration 045 and the full database integration suite were not executed locally.

GitHub Actions remains the final online/dependency/database-backed release gate and must pass before production deployment.

## Security expectations retained

- Production wildcard CORS remains prohibited.
- Verified custom-domain Dynamic CORS remains strict.
- Luke shared origins are exact configured HTTPS origins, not wildcard `*.ar-ai666.com` trust.
- Route and hostname mismatches remain fail-closed.
- Migration files remain checksum-tracked and immutable after deployment.
