BDG CS ASSISTANT v1.16.0-r5
Customer Service Installed-State Verifier Hotfix

PURPOSE
-------
This revision fixes the false verification failure reported by r4 after the
Customer Service route files had already copied successfully.

ROOT CAUSE
----------
The r4 verifier expected the literal text:
  Array.isArray(detail.messages)

The safe route normalizes the API response earlier as:
  Array.isArray(value.messages) ? value.messages : []

The application repair was installed, but the text-marker verifier searched
for a string that was not present and incorrectly reported failure.

R5 FIX
------
The installed-state verifier no longer searches source text. It compares the
SHA-256 hashes of the critical installed files against the exact files inside
the verified payload. This verifies what was copied without depending on code
formatting, variable names, whitespace, or implementation wording.

INSTALL
-------
1. Close any r4 installer window.
2. Extract this r5 package into a new folder.
3. Run START-HERE-WINDOWS.bat.
4. Review Git changes before committing or pushing.

The installer is safe after the partial r4 run. It creates a new rollback
backup and reapplies the complete reviewed hotfix.

No database migration is added or modified. Migration 038 remains unchanged.
