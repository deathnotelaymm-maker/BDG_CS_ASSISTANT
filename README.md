# v1.15.5 — Simplified AI Production Runtime

v1.15.5 removes the competing AI decision layers from live production and
reduces the customer-support workflow to one compiled Assistant Setup prompt,
one approved Menu & Images catalog, and one DeepSeek request.

Release marker: `1.15.5-simplified-ai-production-runtime`

## Production AI architecture

```text
Customer message
      ↓
Resolve tenant and platform
      ↓
Detect message language
      ↓
Load active immutable Assistant Setup runtime
      ↓
Reset incompatible old assistant memory
      ↓
Load approved, published Menu & Images only
      ↓
Call DeepSeek once
      ↓
Validate selected menu/image ID on the server
      ↓
Attach approved image and optional buttons
      ↓
Write exact runtime diagnostics and return response
```

The visible Admin AI workspace is now limited to:

- **Assistant Setup** — role, job, language, style, safety, provider, memory,
  retries, timeout, and fallback settings.
- **Menu & Images** — the only source of live menu facts and approved images.
- **Test & Diagnostics** — fresh-session tests, runtime hash, source selection,
  provider status, and retired-module status.
- **Buttons (Optional)** — server-approved customer actions.

## Retired from live production

The following modules are removed from the Admin navigation and rejected by the
backend with HTTP `410 AI_MODULE_RETIRED`:

- AI Knowledge Import
- AI Q&A
- Configurable AI Source Router
- AI Locale Studio
- AI Response Quality
- Advanced two-stage AI routing

Old page URLs redirect to their supported replacement. Historical database
rows and tables are preserved as inert rollback/audit data for this release;
they are not read by live chat and cannot be changed through the retired API
routes.

## Assistant Setup behavior

Every enabled prompt section is compiled into one immutable active runtime.
The standard sections are:

1. Platform Identity
2. Assistant Role
3. Job and Allowed Scope
4. Approved Factual Boundaries
5. Language Policy
6. Response Style
7. Output Contract
8. Safety Rules
9. Escalation
10. Forbidden Actions

Every save, update, delete, restore, or rebuild creates a new runtime version
and SHA-256 hash. Existing chat memory is cleared automatically when the active
runtime hash changes.

## Menu & Images behavior

Only `ai_content_items` records meeting every condition below enter the live AI
catalog:

```text
source_type = prompt_image
status = published
approval_status = approved
deleted_at = null
matching tenant and platform
matching requested/default locale or all
```

General questions may still be answered from Assistant Setup when no menu item
matches. The AI must not invent menu names, prices, availability, delivery
coverage, payment methods, promotions, or order status. Images and buttons are
attached only after the server validates the selected approved item.

## Language behavior

When the client does not explicitly select a language, the backend detects the
message script. Burmese, English, Hindi, Chinese, Arabic, Thai, Japanese, and
Korean are recognized before the platform default locale is used. The values
`auto`, `automatic`, `detect`, and `all` request automatic detection.

## Database migration

Migration `037_v1.15.5_simplified_ai_production_runtime.sql`:

- forces approved-source blocking off;
- forces the workflow to `prompt_first`;
- disables historical source-router settings;
- limits the historical router contract to `prompt_image`;
- archives existing AI Q&A rows;
- records the v1.15.5 migration marker.

Migration `037` is immutable after deployment. The next database change must
use migration `038`.

## Recommended production configuration

```text
AI_MODE_ENABLED=true
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_KEY=<Render secret>
```

Recommended Admin values:

```text
AI enabled: ON
Conversation memory: ON after acceptance testing
Temperature: 0.2
Max tokens: 1200
Retries: 1 or 2
Provider timeout: 12000 ms
Fallback: Clarify, then human
```

Keep every real menu item in **Menu & Images** as a draft until its facts,
price, availability, delivery terms, payment methods, and image are reviewed.
Publish only after `Status = Published` and `Approval = Approved` are both set.

## Verification commands

```bash
npm --prefix backend-api run check
npm --prefix backend-api run test:regression
npm --prefix backend-api run test:prompt-runtime
npm --prefix backend-api run test:simplified-ai
npm --prefix backend-api run test:chat-reliability
npm --prefix backend-api run test:security
npm --prefix backend-api run test:structured
npm --prefix backend-api run test:upload
npm run typecheck:all
npm run build:all
```

The PostgreSQL integration suite requires a disposable database whose name
contains `test`:

```bash
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bdg_integration_test npm run test:integration
```

## Windows installation

1. Extract `BDG-v1155-simplified-ai-production-runtime.zip`.
2. Double-click `START-HERE-WINDOWS.bat`.
3. Review the rollback backup path and visible Git changes.
4. Commit `v1.15.5 Simplified AI Production Runtime`.
5. Push and follow `DEPLOYMENT_CHECKLIST_V1.15.5.md`.

The installer defaults to
`C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT`. Set `BDG_TARGET`
or pass a repository path to the installer to use another location. It never
commits, pushes, deploys, or reads production secrets.


## v1.16.0 Human Support & Live Chat

The production stack now includes `staff-pro`, an independent customer-service console. The backend exposes an authenticated `/support` WebSocket gateway, platform-scoped staff accounts, waiting queues, assignment locking, transfers, presence heartbeats, unified AI/human conversation history, performance reports, and audit logs. Apply migration `038_v1.16.0_human_support_live_chat_foundation.sql` and keep `human_support_enabled` off until acceptance testing is complete.
