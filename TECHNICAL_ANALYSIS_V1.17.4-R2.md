# Technical Analysis — v1.17.4-R2

## Root cause

The production v1.17.4 Staff application intentionally identifies itself as `Luke CS Workspace`. The legacy `support-foundation-regression-test.js`, originally introduced for the Human Support foundation, still used a literal positive check for `Luke Support Workspace`.

Because GitHub CI executes the historical regression suites in sequence, the stale literal became a false-negative after the product rename even though the dedicated Staff application, Team queue, authentication modes, SSE delivery, and v1.17.4 functionality remained present.

## Repair

R2 changes the legacy Human Support test from one branding-coupled compound assertion into independent current contracts:

1. Staff application contains the current `Luke CS Workspace` identity.
2. Staff application retains the Team queue.
3. Staff application retains Staff and Administrator login modes.

A new dependency-free `v1.17.4-r2-regression-contract-stabilization-test.js` audits the relevant support-facing regression scripts and prevents a positive `includes('Luke Support Workspace')` assertion from being reintroduced.

## Why this is safer than changing the application

Changing the production application back to the old title would undo an intentional v1.17.4 product decision and conflict with the new CS-domain/identity design. Updating the stale test keeps the historical regression useful while aligning it with the current contract.

## Database

No schema change is required. Migration `047` remains immutable and current. The next migration remains `048`.

## Verification boundary

The R2 source-contract tests and carry-forward suites were run locally. Full dependency-backed GitHub execution remains the authoritative gate for npm audit, security sanitizer behavior, frontend typechecks/builds, and PostgreSQL integration. A temporary local sanitizer stub was used only to exercise the Human Support import path and was removed before packaging; security results from that stub are explicitly not claimed.
