# v1.15.2 verification

## Passed in this release workspace

- Backend syntax checks: passed.
- Source regression suite: passed, 49/49.
- AI response reliability suite: passed, 4/4.
- Workbook import regression: passed, 4 behavior groups.
- Rich HTML and connector security regression: passed, 3 behavior groups.
- Structured response regression: passed, 4/4.
- R2 upload/media regression: passed, 9/9.
- Admin TypeScript: passed.
- Chat TypeScript: passed.
- Guide TypeScript: passed.
- Backend dependency audit: 0 known vulnerabilities.
- Admin dependency audit: 0 known vulnerabilities.
- Chat dependency audit: 0 known vulnerabilities.
- Guide dependency audit: 0 known vulnerabilities.
- Admin production build: passed.
- Chat production build: passed.
- Guide production build: passed.

The existing non-failing Guide chunk-size advisory remains. npm also reports
deprecated transitive packages below ExcelJS 4.4.0; npm audit reports no known
vulnerability and the release does not force incompatible archive overrides.

## PostgreSQL/API integration suite

The updated suite is checked for JavaScript syntax and runs in GitHub Actions
against its disposable PostgreSQL 16 service. It now covers:

- all 33 numbered SQL migration files and checksum re-run behavior;
- real owner login, scoped FAQ CRUD, stored HTML sanitization, and isolation;
- shared Pages origin acceptance and unmapped custom-hostname rejection;
- private connector rejection;
- deterministic Indonesian local conversation without a provider call;
- platform-default source fallback for an Indonesian question;
- a successful grounded judge/composer response through a fake provider HTTP
  endpoint;
- retryable composer HTTP 503 responses;
- approved-source fallback with no error block and no public provider detail;
- persisted response status, resolution path, degraded reason, and attempts;
- quality findings and a non-degraded live-router test run persisted in SQL.

This workspace has no PostgreSQL server, so the destructive database suite was
not executed locally. CI creates the disposable database. The script refuses to
use `DATABASE_URL` and refuses to reset a database whose name does not contain
`test`.
