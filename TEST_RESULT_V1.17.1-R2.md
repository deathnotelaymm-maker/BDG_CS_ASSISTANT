# Test Result — v1.17.1-r2

Executed in the packaging environment:

- Backend package/lock JSON validation: passed.
- npm lock/package compatibility check (`npm ci --package-lock-only --offline`): passed.
- v1.17.1-r2 dependency contract regression: 8/8 passed.
- Existing dependency-free backend regression suites: passed where executed.
- Repair payload/source equality: verified.
- SHA-256 package verification: passed.
- ZIP CRC integrity: passed.

The packaging environment does not have outbound npm registry access, so a live `npm ci` plus `npm audit --audit-level=high` cannot be executed here. GitHub Actions remains the authoritative online registry/audit gate. The lockfile uses the official npm tarball and the published SHA-512 integrity for Nano ID 3.3.17.
