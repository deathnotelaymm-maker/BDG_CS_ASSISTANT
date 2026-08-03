# Migration runner

`npm run migrate` calls `runMigrations()` from `src/core.js`.

The runner:

1. validates production configuration;
2. connects with Render's direct `MIGRATION_DATABASE_URL`;
3. takes PostgreSQL advisory lock `701070`;
4. completes the existing idempotent schema/bootstrap repair for older installs;
5. discovers every `NNN_*.sql` file in this directory and sorts it numerically;
6. calculates a SHA-256 checksum and compares it with
   `schema_migration_files`;
7. applies each new file in its own transaction and records the checksum;
8. refuses a checksum mismatch because released migration files are immutable;
9. releases the lock and closes the migration connection.

Migration `033_v1.15.1_stabilization_security_repair.sql` completes the quality
center indexes and records the v1.15.1 stabilization marker. Migration `030`
owns the AI quality tables.

Migration `034_v1.15.2_ai_response_reliability_repair.sql` upgrades the locale
router default, removes the known legacy network-blaming fallback, and adds
durable AI response-path diagnostics. It is protected by the immutable checksum
registry.

The migration command runs during Render pre-deploy. Customer requests never
run the file migration sequence.

Migration `035_v1.15.3_prompt_first_ai_repair.sql` switches the default live
chat workflow to one prompt-first provider call, permits general answers under
the configured Prompt Manager rules, and upgrades legacy DeepSeek model names
to `deepseek-v4-flash`.

Migration `036_v1.15.4_prompt_runtime_versioning_repair.sql` adds immutable
compiled Prompt Manager runtime versions, an atomic active-runtime pointer,
prompt-aware session memory fields, and exact prompt version/hash diagnostics.
Published migration `036` is immutable and must never be edited after deployment.
