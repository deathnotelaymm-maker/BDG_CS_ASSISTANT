# Luke CS v1.18.0 — Luke Shop Commerce Connector v2

Current release: **v1.18.0**. This release is based on the real v1.17.4 CS source and adds the read-only Luke Shop Commerce Connector while preserving the v1.17.4 support workspace, identity, domain, promotion, realtime and Prompt Manager architecture.

See `RELEASE_NOTES_V1.18.0.md`, `TECHNICAL_ANALYSIS_V1.18.0.md`, `DEPLOYMENT_CHECKLIST_V1.18.0.md`, and `TEST_RESULT_V1.18.0.md`.

---

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


Luke v1.17.4-R4-R1 - Windows Installer Compatibility Hotfix

Purpose
-------
This package replaces the v1.17.4-R4 Windows target verifier that failed on
Windows PowerShell 5.1 while parsing npm package-lock v3 files.

The R4 application changes are preserved exactly. Migration 047 remains current.
No migration 048 is created or applied.

Install
-------
1. Extract this ZIP into a fresh folder.
2. Double-click START-HERE-WINDOWS.bat.
3. Review the installer output and Git diff.
4. Commit/push only after review.
5. Require the full GitHub npm ci, typecheck, build and audit gates to pass.

Default repository:
C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT

The START-HERE window remains open on success or failure.
