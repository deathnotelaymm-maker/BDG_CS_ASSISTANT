# v1.15.1 — Stabilization & Security Repair

## Purpose

v1.15.1 completes unfinished v1.15 work, closes the identified rich-content and
connector security gaps, makes TypeScript and dependency health release gates,
and brings the migration/deployment package back to the established BDG style.

Existing tenant content, platform routes, memberships, domains, media, and
publication state are preserved.

## AI Response Quality Center

- Added the missing authenticated, tenant/platform-scoped backend routes for
  overview, scans, findings, finding resolution, test cases, single runs, and
  suite runs.
- Added the missing Admin API bindings and navigation entry.
- Quality scans are advisory and never delete, merge, approve, or publish
  content.
- Scans find normalized duplicate intents, conflicting approved answers,
  published AI items without specific instructions, and missing image mappings.
- Response tests call the production router used by Chat and validate expected
  source/intent, required and forbidden facts, and image expectations.
- Findings, cases, and runs are restricted by both `tenant_id` and
  `platform_id` and persisted in PostgreSQL.

## Security repairs

- Replaced regex-only HTML filtering with server-side `sanitize-html` allowlists
  plus browser-side DOMPurify defense in depth.
- Sanitized FAQ, AI content, AI Q&A, Guide legacy HTML, and Guide translation
  HTML on write and/or output as appropriate.
- Added Cloudflare Pages `_headers` files with CSP and supporting security
  headers. Admin and Guide reject framing; Chat allows HTTPS embedding.
- Connector endpoints now require HTTPS, reject embedded credentials, resolve
  and inspect every DNS answer, block private/local/reserved IPv4 and IPv6,
  reject redirects, cap response size, and pin the approved IP into the TLS
  socket to prevent DNS rebinding.

## Dependencies and workbook imports

- Removed `xlsx` and its high-severity advisory path.
- Reimplemented `.xlsx` parsing and template generation with ExcelJS.
- Updated `sanitize-html` beyond the affected URI-validation range.
- Overrode ExcelJS's UUID dependency to a fixed maintained version.
- Added DOMPurify to Guide Pro.
- Refreshed frontend lockfiles; npm audit reports zero known vulnerabilities in
  backend, Admin, Chat, and Guide dependency trees.

## TypeScript and CI

- Repaired all known Admin, Chat, and Guide TypeScript errors.
- Added `typecheck` scripts to every frontend and aggregate root commands.
- Both normal CI and the production release workflow run type-checks before
  builds/deployments.
- CI now starts PostgreSQL 16 and runs backend regression, workbook, security,
  and database/API integration suites.
- The integration harness models the shared Chat Pages origin separately from
  custom customer hostnames. Shared-route reads must pass, while an unmapped
  hostname must still fail with `PLATFORM_CONTEXT_MISMATCH`; CI does not bypass
  this tenant-routing security check.

## Migration repair

- `npm run migrate` now synchronizes the compatibility bootstrap with every
  numbered SQL migration file.
- `schema_migration_files` records filename, SHA-256 checksum, and application
  time.
- New migrations run once in filename order and in individual transactions.
- Re-running skips matching files; changing an applied file is a hard error.
- Added migration `033_v1.15.1_stabilization_security_repair.sql`.

## Production flow

1. Review and install the release package.
2. Commit and push to `main`.
3. Wait for Render pre-deploy migration and the v1.15.1 API health marker.
4. Let the production workflow type-check, build, and publish all Pages apps.
5. Complete [DEPLOYMENT_CHECKLIST_V1.15.1.md](DEPLOYMENT_CHECKLIST_V1.15.1.md).

The installer creates a rollback backup and only copies files. It does not run
PowerShell, npm, Git, Render, or Cloudflare.
