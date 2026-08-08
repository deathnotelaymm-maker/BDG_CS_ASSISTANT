# Technical Analysis — v1.17.2-r2

## Failure
`POST /admin/ai/prompts` returned `400 PLATFORM_CONTEXT_MISMATCH` in the PostgreSQL integration suite.

## Root cause
The integration helper sent both `Origin: https://admin.example.test` and `X-BDG-Platform-Route: <route>`. v1.17.2 correctly classifies hostnames outside the known Pages/Luke shared-host sets as customer custom-hostname candidates. The synthetic Admin origin was therefore checked against Domain Mapping and failed.

## Repair
Use `https://admin.ar-ai666.com` for the shared Admin integration fixture. Keep the independent unmapped-host assertion to verify route/custom-host mismatch rejection. Add a dependency-free regression that locks this contract into CI.

## Security
The production resolver is intentionally unchanged. Unknown custom hostnames still cannot combine with another platform route.
