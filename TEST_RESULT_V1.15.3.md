# v1.15.3 verification

## Passed locally

- Backend syntax checks: passed.
- Source regression suite: 56/56.
- AI response reliability suite: 6/6.
- Workbook import regression: passed, 4 behavior groups.
- Rich HTML and connector security regression: passed, 3 behavior groups.
- Structured response regression: 4/4.
- R2 upload/media regression: 9/9.
- Admin, Chat, and Guide TypeScript: passed.
- Admin, Chat, and Guide production builds: passed.
- Production dependency audit: 0 vulnerabilities in Backend, Admin, Chat, and
  Guide (`npm audit --omit=dev --audit-level=high`).

## PostgreSQL/API integration coverage

The GitHub Actions PostgreSQL 16 suite now verifies:

- all 34 immutable migration files and checksum re-run behavior;
- migration 035 current model, prompt-first workflow, general-answer mode, and
  output-token settings;
- a real provider-connectivity request through the fake HTTP provider;
- one provider call for a general prompt-governed answer;
- one provider call for a grounded default-locale answer;
- one validated approved image for the matched source;
- bounded provider retries and approved answer/image fallback during outage;
- login, tenant isolation, hostname guards, sanitization, connector SSRF
  rejection, quality findings, and persisted quality runs.

This workspace has no PostgreSQL server, so the destructive database suite is
executed by GitHub Actions. It refuses `DATABASE_URL` and refuses to reset any
database whose name does not contain `test`.
