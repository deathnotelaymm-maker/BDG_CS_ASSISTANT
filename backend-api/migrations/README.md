# Migration runner

`npm run migrate` invokes the versioned compatibility migration in `src/core.js` through `runMigrations()`.

The runner:

1. validates required production secrets;
2. takes PostgreSQL advisory lock `701070`;
3. upgrades the complete v0.6.8 schema and indexes idempotently;
4. creates or upgrades the owner account securely;
5. applies the v0.7.1 diagnostics schema, v0.8.0 structured-response schema, and v0.9.0 AI Content Studio schema idempotently;
6. records the release migration keys in `system_migrations`;
7. releases the lock.

It is executed by Render's `preDeployCommand`, never by customer requests.
