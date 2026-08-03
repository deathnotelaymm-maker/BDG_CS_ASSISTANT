# v1.15.1 verification

## Passed in the release workspace

- Backend syntax/import checks: passed.
- Backend source regression suite: passed, 41/41.
- Workbook import regression: passed, 4/4 behavior checks.
- Rich HTML and connector security regression: passed, 3/3 behavior groups.
- Structured response regression: passed, 4/4.
- R2 upload/media regression: passed, 9/9.
- Admin TypeScript (`tsc --noEmit`): passed.
- Chat TypeScript (`tsc --noEmit`): passed.
- Guide TypeScript (`tsc --noEmit`): passed.
- Backend production dependency audit: passed, 0 known vulnerabilities.
- Admin dependency audit: passed, 0 known vulnerabilities.
- Chat dependency audit: passed, 0 known vulnerabilities.
- Guide dependency audit: passed, 0 known vulnerabilities.
- Admin production build: passed.
- Chat production build: passed.
- Guide production build: passed.

The existing Vite chunk-size advisory for a Guide icon bundle remains a
non-failing optimization notice.

## Real PostgreSQL/API integration coverage

`backend-api/scripts/integration-test.js` is wired into both GitHub workflows
with a disposable PostgreSQL 16 service. It verifies:

- all numbered migration files apply on an empty PostgreSQL database;
- a second migration run skips every checksum-matched file;
- quality tables and the migration registry exist in PostgreSQL;
- real owner login and authenticated API requests;
- FAQ write/read sanitization in both API output and the stored row;
- public FAQ reads through the shared Chat Pages origin;
- rejection of a platform route presented by an unmapped custom hostname;
- tenant/platform isolation through a second routed platform;
- private connector targets rejected by the authenticated API;
- duplicate/conflicting quality findings persisted by a scan;
- a saved response test executed through the live router and persisted.

This workspace did not include a local PostgreSQL server, so that destructive
test was not run here. CI supplies the disposable database. The script refuses
`DATABASE_URL` and refuses to reset a database whose name lacks `test`.

The integration harness calls the backend handler in-process. It does not use
`BDG_API_BASE_URL`, Render, the Cloudflare API, or Cloudflare credentials. Shared
Pages origins and custom customer hostnames are modeled separately so the
production hostname/route mismatch protection remains a required assertion;
there is no CI bypass flag for this security boundary.
