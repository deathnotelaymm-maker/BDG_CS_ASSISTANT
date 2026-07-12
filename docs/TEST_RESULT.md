# Test Result — v0.7.0a

Validation date: 2026-07-12
Status: **PASS — built candidate, not deployed to production accounts**

## Source and configuration

- Built from the verified v0.7.0 Render backend candidate.
- Active Render Blueprint contains one paid Node.js web service and no Render PostgreSQL resource.
- Runtime version is `0.7.0a-render-neon`.
- Runtime configuration requires a pooled Neon `DATABASE_URL`.
- Pre-deploy migration requires a direct Neon `MIGRATION_DATABASE_URL`.
- Validation rejects a direct runtime URL, pooled migration URL, different Neon endpoints, different databases, or missing SSL.

## Build and dependency validation

| Component | Result |
|---|---|
| Render/Neon backend syntax | PASS |
| Guide Pro production build | PASS |
| Chat Pro production build | PASS |
| Admin Pro production build | PASS |
| Backend production dependency audit | 0 vulnerabilities |
| Guide production dependency audit | 0 vulnerabilities |
| Chat production dependency audit | 0 vulnerabilities |
| Admin production dependency audit | 0 vulnerabilities |

## Infrastructure validation

| Check | Result |
|---|---|
| `render.yaml` YAML parse | PASS |
| `render.staging.example.yaml` YAML parse | PASS |
| GitHub Actions YAML parse | PASS |
| No active `databases:` Render resource | PASS |
| Neon pooled/direct configuration unit checks | PASS |
| Liveness without a database query | PASS |
| Liveness reports Neon pooled runtime | PASS |
| Readiness fails closed when Neon is unavailable | PASS |
| Disallowed CORS origin returns HTTP 403 | PASS |
| Migration script selects `MIGRATION_DATABASE_URL` | PASS |
| v0.7.0 → v0.7.0a overlay simulation | PASS |
| Patched Guide/Chat/Admin builds | PASS |

## Deployment/account validation still required

The release does not embed real Neon, Render, Cloudflare R2, DeepSeek, GitHub, or Cloudflare Pages credentials. After deployment, run:

```powershell
.\VERIFY-NEON-CONNECTIONS-V0.7.0A-WINDOWS.ps1
.\VERIFY-V0.7.0A-WINDOWS.ps1 -ApiBaseUrl "https://YOUR-RENDER-SERVICE.onrender.com"
```

Then complete `DEPLOYMENT_CHECKLIST_V0.7.0A.md`.

## Known non-blocking warnings

- Guide Pro `CategoryIcon` chunk remains approximately 594 KB.
- Admin Pro main JavaScript remains approximately 1.27 MB.
- Vite reports the existing `vite-tsconfig-paths` deprecation warning.
- Recharts 2.x reports the existing maintenance warning.
