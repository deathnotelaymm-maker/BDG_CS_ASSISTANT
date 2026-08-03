# v1.15.2 PostgreSQL integration fixture repair

The production workflow reached the disposable PostgreSQL integration suite and
failed at `backend-api/scripts/integration-test.js:121` with PostgreSQL error
`42P10`.

The fixture inserted the Indonesian locale using:

`ON CONFLICT(platform_id, locale)`

The real `platform_locales` table is tenant scoped and defines this unique key:

`UNIQUE(tenant_id, platform_id, locale)`

PostgreSQL requires the conflict target to match an existing unique or exclusion
constraint. The fixture now uses the complete tenant/platform/locale key:

`ON CONFLICT(tenant_id, platform_id, locale)`

This changes test setup only. Runtime locale routing, production data, migration
034, and the v1.15.2 API contract are unchanged. The correction preserves the
same tenant-isolation identity used by the application schema.
