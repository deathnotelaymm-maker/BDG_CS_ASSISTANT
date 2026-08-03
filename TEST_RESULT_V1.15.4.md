# v1.15.4 verification result

Verification date: 2026-08-03

## Independently executed in this workspace

- Backend JavaScript syntax checks: passed.
- Prompt runtime regression suite: 5/5 passed.
- AI response reliability suite: 6/6 passed.
- Source regression suite: 62/62 passed.
- Changed Admin TypeScript/TSX parse check: no TypeScript syntax/parser errors.
- v1.15.4 release marker checks: passed.

## New coverage

The new tests verify:

- every enabled section is compiled in stable priority order;
- editing, deleting, or disabling a section changes the runtime hash;
- section and compiled hashes are deterministic SHA-256 values;
- section and total clipping produce visible warnings;
- an empty Prompt Manager receives a safe fallback;
- prompt operations publish immutable runtime versions;
- old and pre-versioned session memory is reset on runtime change;
- Admin tests always receive a fresh random session;
- Prompt Manager exposes the exact runtime preview and warnings;
- Chat Logs expose runtime version, hash, sections, size, and reset reason.

## PostgreSQL/API integration runner updated

`backend-api/scripts/integration-test.js` now verifies on a disposable
PostgreSQL database:

- migration 036 and both runtime tables;
- immutable migration checksum re-runs;
- two separately saved prompt sections appear in the exact compiled runtime;
- prompt runtime endpoints return no-store headers;
- a greeting travels through the prompt-first provider with both markers;
- a later prompt edit activates a different hash;
- the next request in the same session clears old memory;
- runtime hash, section IDs, and reset reason persist in `chat_logs`.

The integration runner was not executed in this container because no disposable
PostgreSQL test service or installed Node production dependencies were
available. It remains wired into the production GitHub Actions workflow.

## Environment-blocked verification

A clean `npm ci` attempt stalled while contacting the npm registry. Therefore,
the following dependency-based checks were not independently rerun here:

- Admin, Chat, and Guide full TypeScript checks;
- Admin, Chat, and Guide production builds;
- upload, structured response, security, and workbook-import suites that import
  production dependencies;
- PostgreSQL/API integration execution;
- production dependency audit.

The changed Admin files were still parsed with the globally installed TypeScript
compiler; all reported errors were missing external modules caused by the
blocked install, and there were no syntax/parser errors.
