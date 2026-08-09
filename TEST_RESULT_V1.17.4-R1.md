# Test Result — v1.17.4-R1

## Provided GitHub CI evidence before R1

The supplied CI log shows that GitHub successfully completed `npm ci` (154 packages), backend JavaScript `check`, main regression `62/62`, Prompt Runtime `5/5`, Simplified AI `5/5`, and Human Support `24/24`. It then failed in `test:v1161` at the old combined Staff workspace assertion. This is the source-sync failure R1 targets.

## Executed against the R1 source in this build environment

- Modified regression-script JavaScript syntax: PASS.
- Main regression: `62/62` PASS.
- Prompt Runtime: `5/5` PASS.
- Simplified AI: `5/5` PASS.
- v1.16.1 realtime AI worker carry-forward: `29/29` PASS after diagnostic split.
- v1.17.3 Support Workspace UX: `35/35` PASS.
- v1.17.4 CS identity/domain/promotion/menu: `47/47` PASS.
- v1.17.4-R1 CI/source-sync guard: `12/12` PASS.
- TypeScript/TSX parse-only validation: `190` files, `0` syntax errors.
- GitHub workflow YAML parse: PASS for normal CI and production-release workflows.
- Canonical Staff App SHA-256: `bbfb2f4519b3f2f824bda85eb558f45467799a121bf9d12e03305f3c105b4e91`.
- Canonical Staff API SHA-256: `510f67d29061094737b05f6a507a5eda9ca52b33366cb94dfbb1372b660886b6`.

## Repair-package dry installation

- Reviewed R1 payload: `27` files.
- Payload copied over a clean final-v1.17.4 source tree: PASS.
- Installed payload SHA-256: `27/27` PASS.
- Dry-installed v1.16.1 carry-forward: `29/29` PASS.
- Dry-installed v1.17.3 carry-forward: `35/35` PASS.
- Dry-installed v1.17.4 regression: `47/47` PASS.
- Dry-installed v1.17.4-R1 source-sync regression: `12/12` PASS.

## Environment limits

A fresh dependency installation could not be completed inside this local build container, so dependency-backed suites that require unavailable packages, full frontend project typechecks/builds, npm audit, and PostgreSQL integration are not claimed as local R1 passes. The supplied GitHub run demonstrates that dependency installation and all suites preceding `test:v1161` were healthy in CI. Both workflows now add `test:v1174r1`; the complete GitHub pipeline remains the production gate.
