# v1.17.4-R3 Test Result

## Passed locally

- Backend JavaScript syntax check: PASS.
- Main regression: 62/62 PASS.
- Prompt runtime: 5/5 PASS.
- Simplified AI: 5/5 PASS.
- v1.16.1 realtime: 29/29 PASS.
- v1.16.3: 13/13 PASS.
- v1.16.4: 16/16 PASS.
- v1.17.0: 30/30 PASS.
- v1.17.1: 25/25 PASS.
- v1.17.1-R2: 8/8 PASS.
- v1.17.2: 28/28 PASS.
- v1.17.2-R2: 9/9 PASS.
- v1.17.3: 35/35 PASS.
- v1.17.4: 47/47 PASS.
- v1.17.4-R1: 12/12 PASS.
- v1.17.4-R2: 15/15 PASS.
- v1.17.4-R3 dependency lock security: 21/21 PASS.
- AI response reliability: 6/6 PASS.

## Environment boundary

The local execution environment could not reach the npm audit endpoint or fetch the newly patched packages from the registry, so R3 does not claim a local `npm ci`/`npm audit` pass. GitHub Actions remains the authoritative dependency-backed gate. The user's prior GitHub run already demonstrated that Guide typecheck/build succeeds; R3 changes dependency resolution only.

The R3 source guard verifies the exact patched lock versions against the current GitHub advisory patched-version contracts.
