# Changelog — v0.7.0a

- Changed production database target from Render PostgreSQL back to the existing Neon PostgreSQL database.
- Split runtime and migration connections into pooled and direct Neon URLs.
- Removed database creation and transfer from Render Blueprint/deployment flow.
- Added Neon-specific configuration validation, backup, verification, and rollback safety.
- Updated runtime version and migration marker.
- Preserved v0.7.0 backend security, reliability, R2, DeepSeek, frontend retry states, and API contracts.
