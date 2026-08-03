BDG CS ASSISTANT v1.15.4-r2
ADMIN PROMPT MANAGER TYPECHECK HOTFIX

This revision supersedes the original v1.15.4 repair archive.
Application version remains v1.15.4; r2 identifies the corrected release package.

Fixed GitHub Actions Admin production failure:
- TS2339: Property 'clipped' does not exist on type '{}'.
- TS2339: Property 'hash' does not exist on type '{}'.

Root cause:
TypeScript inferred the Prompt Manager runtime Map value as {} because the API payload was untyped.

Repair:
- Added PromptRuntimeSectionSnapshot.
- Added explicit Map<number, PromptRuntimeSectionSnapshot> typing.
- No API, backend, database, migration, or production-data change.

Run START-HERE-WINDOWS.bat from the repair package.
Review changes, commit, push, and rerun Build and publish BDG production.
