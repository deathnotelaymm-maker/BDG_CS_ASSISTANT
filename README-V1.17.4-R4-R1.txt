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
