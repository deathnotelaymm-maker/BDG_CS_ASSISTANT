# BDG Render Backend with Neon PostgreSQL

Version: `1.15.5-simplified-ai-production-runtime`

This Node.js service runs on Render and uses Neon PostgreSQL. Runtime traffic
uses the pooled `DATABASE_URL`; Render pre-deploy migrations use the direct
`MIGRATION_DATABASE_URL`.

## Commands

```bash
npm ci
npm run check
npm run test:regression
npm run test:prompt-runtime
npm run test:simplified-ai
npm run test:chat-reliability
npm run test:security
npm run test:structured
npm run test:upload
npm run migrate
npm start
```

Run the real database/API suite only against a disposable database whose name
contains `test`:

```bash
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bdg_integration_test npm run test:integration
```

## Live AI contract

Live chat uses one fixed production workflow:

```text
compiled Assistant Setup runtime
+ approved published Menu & Images catalog
+ customer message and compatible memory
→ one DeepSeek JSON request
→ server validation of selected item/image/button
```

Only hard safety-boundary messages bypass the provider. Greetings, help
requests, menu questions, and ordinary conversation use the active Assistant
Setup runtime.

Only rows with `source_type='prompt_image'`, `status='published'`, and
`approval_status='approved'` can enter the live catalog. AI Q&A, imported
knowledge, FAQ, Guide, and configurable source-router rows are not consulted by
live chat.

The backend forces:

```text
workflow_mode = prompt_first
require_approved_context = false
source_order = [prompt_image]
```

The old AI module endpoints return HTTP 410 with code `AI_MODULE_RETIRED`.
Their historical data remains inert for rollback/audit during the v1.15.5
stabilization period.

## Prompt runtime contract

Every enabled Assistant Setup section is compiled in stable priority order.
The active runtime stores its version, SHA-256 hash, section IDs, section
hashes, warnings, character count, and creation note. Sessions reset old
assistant memory whenever the active hash changes.

## Language contract

The backend uses an explicitly requested supported language when supplied.
`auto`, `automatic`, `detect`, and `all` request automatic script detection.
Without an explicit language it detects common Burmese, Hindi, Chinese, Arabic,
Thai, Japanese, and Korean scripts before falling back to the platform locale.

## Migration contract

`npm run migrate` obtains advisory lock `701070`, completes the legacy
idempotent bootstrap, then applies numbered SQL files in order. Applied file
names and SHA-256 checksums are stored in `schema_migration_files`. A changed
historical migration stops deployment.

Migration `037_v1.15.5_simplified_ai_production_runtime.sql` retires the old AI
runtime paths, archives Q&A records, and fixes the production source contract.
It is immutable after release. The next migration number is `038`.

## Security contract

- Admin and content operations remain tenant/platform scoped.
- Retired AI routes cannot read, write, publish, route, or test old modules.
- Draft or unapproved Menu & Images items never enter live prompts.
- Model-selected IDs are validated against the exact approved candidate set.
- Rich HTML is allowlist-sanitized.
- Upload MIME type, extension, and file signature are verified.
- Connector URLs use HTTPS and DNS-aware SSRF protection.
- Provider errors and secrets are not returned to customers.
- Production startup validates database, auth, origins, AI, and R2 settings.

## Health routes

- `/health/live` — process liveness
- `/health/ready` — PostgreSQL and migration readiness
- `/health/dependencies` — PostgreSQL, R2, and AI configuration
- `/health` — release marker and feature contract
