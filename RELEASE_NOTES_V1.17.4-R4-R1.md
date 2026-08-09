# Luke v1.17.4-R4-R1 — Windows Installer Compatibility Hotfix

## Scope

- Base install target: v1.17.4-R3 (or an equivalent tree already containing the R3 dependency-security baseline).
- Carries forward the exact v1.17.4-R4 application/config payload.
- Replaces the target verifier with Windows PowerShell 5.1-compatible npm lockfile inspection.
- Keeps the R3/R4 launcher behavior that displays SUCCESS/FAILURE and pauses before closing.
- Does not modify database migration `047` and does not create migration `048`.

## Root cause repaired

The original R4 verifier parsed npm lockfile v3 with `ConvertFrom-Json`. Windows PowerShell 5.1 rejects the required empty-string key under `packages`, producing `ConvertFrom-Json ... argument "name" is not valid` before installation.

R4-R1 reads only the needed `node_modules/<package>` entries from raw lockfile JSON. This is the same compatibility approach that was manually verified on the target Windows machine before packaging.

## R4 product changes carried forward unchanged

- Ant Design v6 Divider title alignment uses `titlePlacement="start"`.
- Vertical Dividers use `orientation="vertical"` instead of deprecated `type="vertical"`.
- R3 dependency-security gate remains in both normal and production CI.
- R4 compatibility gate remains in both normal and production CI.
