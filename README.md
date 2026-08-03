# v1.15.1 — Stabilization & Security Repair

This release finishes the v1.15 line without changing the production architecture:
Cloudflare Pages hosts Guide Pro, Chat Pro, and Admin Pro; Render runs the Node.js
API; Neon remains the PostgreSQL database; Cloudflare R2 stores media; and
DeepSeek remains the optional AI provider.

The API release marker is:

`1.15.1-stabilization-security-repair`

## What is repaired

- The **AI Response Quality Center** is complete and visible in Admin. Its
  platform-scoped APIs scan duplicate intents, conflicting answers, missing
  instructions, and missing image mappings. Saved response tests execute the
  same live router used by Chat and persist their results.
- Rich HTML uses an allowlist sanitizer in the API and DOMPurify in Guide Pro.
  Old rows are sanitized on output; new and edited rows are sanitized on write.
- Cloudflare Pages receives CSP, content-type, referrer, permissions, and frame
  protection headers. Chat remains embeddable by HTTPS parent pages.
- Operations Connector URLs must be HTTPS, resolve only to public addresses,
  cannot redirect, and use a DNS-pinned socket to prevent rebinding into private
  or cloud-metadata networks.
- The vulnerable `xlsx` dependency is removed. Workbook import/export now uses
  ExcelJS, `sanitize-html` is updated, transitive UUID is overridden to a fixed
  release, and all four npm dependency trees report zero known vulnerabilities.
- Admin, Chat, and Guide pass `tsc --noEmit`. Type-checking is required by CI and
  the production release workflow before any Pages deployment.
- The migration command applies every numbered SQL file in order, stores its
  SHA-256 checksum, refuses edited historical migrations, and safely skips files
  already applied with the same checksum.
- PostgreSQL 16 integration tests exercise migrations, login, API CRUD, tenant
  isolation, stored sanitization, connector rejection, shared Pages routing,
  custom-hostname mismatch rejection, quality scans, and live router test-run
  persistence.

## Local verification

```bash
npm --prefix backend-api ci
npm --prefix backend-api run check
npm --prefix backend-api run test:regression
npm --prefix backend-api run test:knowledge-import
npm --prefix backend-api run test:security
npm run typecheck:all
npm run build:all
```

The database suite intentionally requires a disposable database whose name
contains `test`:

```bash
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bdg_integration_test npm run test:integration
```

The test refuses to use `DATABASE_URL` and refuses to reset a database whose
name does not contain `test`. It invokes the backend handler directly and does
not call Render or Cloudflare; the simulated shared Pages origin is intentionally
different from an unmapped custom hostname.

## Production deployment

1. Review [RELEASE_NOTES_V1.15.1.md](RELEASE_NOTES_V1.15.1.md) and
   [DEPLOYMENT_CHECKLIST_V1.15.1.md](DEPLOYMENT_CHECKLIST_V1.15.1.md).
2. Commit and push the reviewed files to `main`.
3. Render runs `npm run migrate` with the direct Neon migration URL, then starts
   the API with the pooled Neon URL.
4. The production workflow waits for the matching API release, type-checks and
   builds all three frontends, and publishes them to Cloudflare Pages.
5. Confirm `/health/live` and `/health/ready` report the v1.15.1 marker, then
   follow the functional checks in the deployment checklist.

No Render PostgreSQL database is created and no production data transfer is
required.

## Short-path Windows install

Extract `BDG-v1151-stabilization-security-repair.zip` into a short folder such
as `C:\BDG-v1151`, then double-click:

`INSTALL-V1.15.1-STABILIZATION-SECURITY-REPAIR.cmd`

The installer copies the payload only into:

`%USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT`

It creates a rollback backup and does not run PowerShell, npm, Git, Render, or
Cloudflare. After it succeeds, review the Changes tab in GitHub Desktop, commit,
and choose **Push origin**.

## Release documents

- [Release notes](RELEASE_NOTES_V1.15.1.md)
- [Verification result](TEST_RESULT_V1.15.1.md)
- [Deployment checklist](DEPLOYMENT_CHECKLIST_V1.15.1.md)
- [Changed files](CHANGED_FILES_V1.15.1.txt)
- [Machine-readable manifest](MANIFEST_V1.15.1.json)
