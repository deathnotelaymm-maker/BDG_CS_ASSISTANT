# Migration runner

`npm run migrate` invokes the versioned compatibility migration in `src/core.js` through `runMigrations()`.

The runner:

1. validates required production secrets;
2. takes PostgreSQL advisory lock `701070`;
3. upgrades the complete v0.6.8 schema and indexes idempotently;
4. creates or upgrades the owner account securely;
5. records `v0.7.0_render_business_backend` in `system_migrations`;
6. releases the lock.

It is executed by Render's `preDeployCommand`, never by customer requests.
