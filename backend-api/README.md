# BDG Render Backend with Neon PostgreSQL

Version: `0.7.0a-render-neon`

This Node.js service runs on Render while preserving the existing Neon PostgreSQL database. Normal application traffic uses `DATABASE_URL` from Neon's pooled connection string. The Render pre-deploy migration uses `MIGRATION_DATABASE_URL` from Neon's direct non-pooled connection string.

## Commands

```bash
npm ci
npm run check
npm run migrate
npm start
```

## Health routes

- `/health/live` checks the Node process without requiring PostgreSQL.
- `/health/ready` checks Neon and the migration table.
- `/health/dependencies` checks Neon, R2, and DeepSeek configuration.

The service validates that the runtime URL contains `-pooler`, the migration URL is direct, both URLs target the same Neon endpoint/database, and SSL is enabled.
