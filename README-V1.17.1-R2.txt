BDG v1.17.1-r2 - Backend Dependency Audit Security Hotfix

Purpose:
- Fix the GitHub Actions high-severity npm audit failure caused by transitive nanoid 3.3.16.
- Keep application runtime version 1.17.1 and migration 044 unchanged.
- Pin Nano ID 3.3.17 through npm overrides and the backend lockfile.
- Add a dependency-contract regression before npm audit.

No database migration.
Current migration: 044
Next migration: 045

Recommended commit:
v1.17.1-r2 Fix backend dependency audit security
