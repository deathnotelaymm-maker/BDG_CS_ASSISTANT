# v1.15.4-r2 — Admin Prompt Manager Typecheck Hotfix

## Status

This package supersedes `BDG-v1154-prompt-runtime-versioning-repair.zip` for repositories that already contain v1.15.4. The application version remains `1.15.4`; `r2` is a release-package revision.

## Failure repaired

GitHub Actions stopped during Admin production typechecking:

```text
src/routes/_admin.ai-prompt-manager.tsx(301,32): TS2339: Property 'clipped' does not exist on type '{}'.
src/routes/_admin.ai-prompt-manager.tsx(323,91): TS2339: Property 'hash' does not exist on type '{}'.
```

## Root cause

`new Map((runtime?.section_snapshot || []).map(...))` did not provide Map key/value generics. Under strict TypeScript 5.8, the value was inferred as `{}`, so optional property access to `clipped` and `hash` failed.

## Fix

The Prompt Manager now declares the runtime snapshot contract and creates:

```ts
new Map<number, PromptRuntimeSectionSnapshot>(...)
```

The runtime response, backend behavior, database schema, prompt hashes, and chat-memory behavior are unchanged.

## Files changed from v1.15.4

- `admin-pro/src/routes/_admin.ai-prompt-manager.tsx`
- r2 release documentation and installer files

## Deployment

Apply the r2 hotfix, review the Git diff, commit, push, and rerun the failed production workflow.
