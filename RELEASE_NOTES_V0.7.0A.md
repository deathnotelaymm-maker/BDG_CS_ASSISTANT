# Release Notes — v0.7.0a

## Render Backend + Neon Production Database

v0.7.0a supersedes the not-yet-deployed v0.7.0 Render PostgreSQL candidate. It keeps the v0.7.0 business backend, security hardening, health checks, caching, and professional public error states while retaining the existing Neon production database.

### Changed
- Removed the Render PostgreSQL resource from production and staging Blueprints.
- Removed Neon-to-Render data transfer from the active deployment path.
- Added `DATABASE_URL` for pooled Neon runtime traffic.
- Added `MIGRATION_DATABASE_URL` for direct Neon pre-deploy migrations/backups.
- Added strict same-endpoint/database and pooler/direct validation.
- Increased connection timeout for Neon compute wake-up tolerance.
- Added PostgreSQL keepalive and application name.
- Added Neon backup, connection verification, and guarded emergency restore scripts.
- Updated health output to identify Neon and pooled runtime mode.
- Added separate staging guidance using a Neon branch/database.

### Data impact
- Data transfer: none.
- Existing Neon records: preserved.
- Schema migration: required and idempotent.
- Migration marker: `v0.7.0a_render_neon_backend`.
