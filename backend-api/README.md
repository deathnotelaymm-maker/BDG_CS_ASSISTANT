# BDG Render Backend with Neon PostgreSQL

Version: `1.15.2-ai-response-reliability-repair`

This Node.js service runs on Render and preserves the existing Neon PostgreSQL
database. Runtime traffic uses the pooled `DATABASE_URL`; Render pre-deploy
migrations use the direct `MIGRATION_DATABASE_URL`.

## Commands

```bash
npm ci
npm run check
npm run test:regression
npm run test:knowledge-import
npm run test:security
npm run migrate
npm start
```

Run the real database/API suite only against a disposable database whose name
contains `test`:

```bash
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bdg_integration_test npm run test:integration
```

The suite invokes the backend handler in-process; it does not call Render or
Cloudflare. Its public-route fixture uses the shared Chat Pages origin, and a
separate negative assertion confirms that an unmapped custom hostname is still
rejected with `PLATFORM_CONTEXT_MISMATCH`.

## Migration contract

`npm run migrate` takes advisory lock `701070`, completes the idempotent legacy
bootstrap, then applies every numbered file in `migrations/` in order. Applied
filenames and SHA-256 checksums are stored in `schema_migration_files`. A changed
historical file stops deployment instead of silently mutating production.

## Security contract

- Rich HTML is allowlist-sanitized on write and output.
- Connector targets require HTTPS, public DNS answers, no redirects, and a
  DNS-pinned TLS connection.
- Connector secrets are encrypted at rest and never returned by API responses.
- Admin requests remain bound to the immutable platform-route header.
- Production startup validates Neon pooling/direct URLs, SSL, authentication
  secrets, allowed origins, AI configuration, and R2 configuration.

## Health routes

- `/health/live` checks the Node process without requiring PostgreSQL.
- `/health/ready` checks PostgreSQL and the migration table.
- `/health/dependencies` checks PostgreSQL, R2, and AI configuration.

The runtime validator requires a Neon pooled hostname for normal traffic, a
matching direct hostname for migrations, the same Neon database, and SSL.
