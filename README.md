# v1.15.2 — AI Response Reliability Repair

v1.15.2 keeps the v1.15.1 security and stabilization work and repairs the live
Chat behavior that could return a red connection-style card even though Render
successfully returned HTTP 200.

Release marker:

`1.15.2-ai-response-reliability-repair`

## What was actually wrong

- A normal support answer required two sequential DeepSeek calls: a meaning
  judge and a response composer. Either call could fail the whole turn.
- Admin exposed retry and timeout settings, but the live calls hard-coded one
  attempt and shorter timeouts, so those controls did not protect production.
- The judge could serialize up to 60 large records into one prompt. Large
  source catalogs could make requests slow or exceed a practical prompt budget.
- Indonesian could be enabled for Chat while the live source query admitted
  only Indonesian or universal records. Platforms whose verified content was
  still in English presented an empty catalog to the judge.
- `no_match`, provider failure, and composer failure all became an `error`
  response block. Chat rendered that as the red card seen by customers.
- An old saved provider-error sentence blamed the customer's internet even
  when the request reached Render and completed successfully.
- The Quality Center could report a test as passed when it had no expectations,
  even if the AI provider was disabled and the response was degraded.

## Reliability behavior now

- Greetings, thanks, goodbyes, laughter, basic help, and abusive language are
  handled by a deterministic multilingual conversation layer. These turns do
  not depend on DeepSeek and do not consume model latency or quota.
- Saved `max_retries` and `provider_timeout_ms` settings now drive both model
  stages. Every turn also has a 20-second provider deadline so the browser has
  time to receive a safe application response.
- The judge catalog is limited to 40 records and 52,000 serialized characters.
  Truncation, eligible count, prompt size, attempts, latency, and the final
  resolution path are written to structured Render logs and Chat Logs.
- The default source policy is now **exact/base locale, then platform default**.
  It never crosses tenant or platform boundaries. Strict exact-locale policies
  remain available in Admin.
- If the judge selects verified content but the composer fails, the API sends
  the approved source text, media, and buttons directly.
- If no verified source matches, Chat sends a neutral localized notice and an
  optional configured support handoff—not a red network error.
- Raw provider errors remain in protected diagnostics only. Public Chat gets a
  safe `response_status`, `resolution_path`, and request ID.
- English, Indonesian, Hindi, Chinese, and Burmese customer-safe UI and fallback
  copy are included.
- Quality Center tests fail when the response is degraded, even when no source,
  fact, or image expectation was configured.

No application can promise a reply during a total database, Render, DNS, or
browser-network outage. v1.15.2 guarantees a usable application-level response
when the AI provider, JSON formatting, source match, or composer stage fails
while the API and database remain reachable.

## Local verification

```bash
npm --prefix backend-api ci --omit=dev
npm --prefix backend-api run check
npm --prefix backend-api run test:regression
npm --prefix backend-api run test:knowledge-import
npm --prefix backend-api run test:security
npm --prefix backend-api run test:chat-reliability
npm --prefix backend-api run test:structured
npm --prefix backend-api run test:upload
npm run typecheck:all
npm run build:all
```

The database suite requires a disposable PostgreSQL database whose name contains
`test`:

```bash
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bdg_integration_test npm run test:integration
```

It resets only that disposable database, applies every migration twice, calls
the real API handler, persists rows, and uses a deterministic fake DeepSeek HTTP
service for success and outage cases. It never calls production Render,
Cloudflare, Neon, or DeepSeek.

## Production deployment

1. Install the release into the canonical GitHub Desktop repository.
2. Review [RELEASE_NOTES_V1.15.2.md](RELEASE_NOTES_V1.15.2.md) and
   [DEPLOYMENT_CHECKLIST_V1.15.2.md](DEPLOYMENT_CHECKLIST_V1.15.2.md).
3. Commit and push the reviewed changes to `main`.
4. Render applies migration `034_v1.15.2_ai_response_reliability_repair.sql`
   before starting the API.
5. GitHub Actions runs backend checks and the disposable PostgreSQL integration
   suite, waits for the matching Render marker, and then publishes all Pages
   applications.
6. Confirm `/health/live` and `/health/ready` report
   `1.15.2-ai-response-reliability-repair`.

## Windows install

Extract `BDG-v1152-ai-response-reliability-repair-r3.zip` into a short folder such
as `C:\BDG-v1152-r3`, then double-click:

`START-HERE-V1.15.2-AI-RELIABILITY-REPAIR.bat`

The installer writes only to:

`C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT`

It verifies that the destination is a Git repository, creates a rollback backup,
copies the patch, verifies the release marker, and prints `git status --short`.
It never commits, pushes, deploys, or reads production secrets.

## Release documents

- [Release notes](RELEASE_NOTES_V1.15.2.md)
- [Verification result](TEST_RESULT_V1.15.2.md)
- [Deployment checklist](DEPLOYMENT_CHECKLIST_V1.15.2.md)
- [Changed files](CHANGED_FILES_V1.15.2.txt)
- [Machine-readable manifest](MANIFEST_V1.15.2.json)
