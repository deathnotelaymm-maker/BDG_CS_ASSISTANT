# v1.5.0 verification

All local checks completed before packaging:

- Backend syntax: passed (`node --check` for core, server, R2 adapter, and env).
- Backend regression suite: 78/78 checks passed.
- Structured/prompt checks: 4/4 passed.
- Upload regression checks: 4/4 passed.
- Knowledge import checks: passed.
- Operations connector checks: 8/8 passed.
- Tenant platform experience checks: 9/9 passed.
- Admin production build: passed.
- Guide production build: passed.
- Chat production build: passed.
- `git diff --check`: passed.

The Vite chunk-size notices are non-fatal bundle-size warnings. No source
secrets, database exports, `node_modules`, or build output are included in the
short-path package.
