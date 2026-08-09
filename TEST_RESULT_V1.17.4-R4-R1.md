# Test Result — v1.17.4-R4-R1

## Verified in packaging environment

- R4 application/config payload compared byte-for-byte with the v1.17.4-R4 complete source: PASS.
- Fixed lockfile-version extraction validated against all four R3 frontend lockfiles: PASS.
- R4 Ant Design regression: PASS.
- R3 dependency-security regression: PASS.
- R2 regression-contract stabilization: PASS.
- Admin Customer Service route regression: PASS.
- Repair payload SHA-256: PASS.
- Dry copy of repair payload over a clean R3 complete-source tree: PASS.
- Dry-installed payload hashes: PASS.
- Repair ZIP integrity: PASS.
- Complete-source ZIP integrity: PASS.
- No `node_modules`, `.git`, or raw `.env` included: PASS.

## Windows-specific evidence

Before packaging, the corrected PowerShell 5.1 target-verifier logic was run by the user with `powershell.exe -NoProfile -ExecutionPolicy Bypass` against the real repository and returned:

`PASS: target is compatible with v1.17.4-R4.`

The R4-R1 verifier preserves that logic with release-label updates.

## Boundary

The Linux packaging environment does not provide Windows PowerShell 5.1. Final Windows installer execution and full dependency-backed GitHub `npm ci`, typecheck, build and audit remain deployment gates.
