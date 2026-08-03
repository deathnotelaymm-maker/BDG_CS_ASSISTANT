# v1.15.4 — Prompt Runtime and Versioning Repair

v1.15.4 makes Prompt Manager changes observable, versioned, and immediately
reliable. Every enabled Prompt Manager section is compiled in priority order
into one active runtime. Every save, update, delete, restore, or manual rebuild
creates an immutable runtime version with a SHA-256 hash.

Release marker: `1.15.4-prompt-runtime-versioning-repair`

## What this repairs

- All enabled prompt sections are compiled into one exact runtime rather than
  behaving like unrelated cards.
- The active runtime records section IDs, section hashes, compiled prompt hash,
  character count, warnings, creation time, and change note.
- Prompt reads and runtime previews use `Cache-Control: no-store`.
- Chat sessions store the prompt runtime version and hash they last used.
- Old assistant memory is cleared automatically when the active prompt hash
  changes, including existing sessions created before prompt versioning.
- Admin AI tests always use a new session with fresh memory.
- Chat Logs show the exact prompt runtime and memory-reset reason used for each
  response.
- Greetings, thanks, help requests, and normal questions now pass through the
  active Prompt Manager runtime. Only hard safety-boundary messages remain
  deterministic and provider-free.
- The existing one-call prompt-first workflow and validated approved-image
  attachment remain intact.

## Runtime workflow

```text
Prompt Manager save / update / delete / restore
                    ↓
Compile every enabled section by priority
                    ↓
Validate limits and create warnings
                    ↓
Create immutable runtime version + SHA-256
                    ↓
Atomically activate that runtime for the platform
                    ↓
Next chat request compares session hash to active hash
                    ↓
Clear incompatible old assistant memory when different
                    ↓
Send exact compiled runtime to DeepSeek once
                    ↓
Validate selected approved source and image
                    ↓
Log runtime version, hash, sections, and reset reason
```

## Database migration

Migration `036_v1.15.4_prompt_runtime_versioning_repair.sql` adds:

- `ai_prompt_runtime_versions`
- `ai_prompt_runtime_state`
- prompt runtime fields on `chat_sessions`
- prompt runtime diagnostics on `chat_logs`

Migration 036 is immutable after deployment. Never edit it. The next database
change must use migration 037.

## Admin workflow

1. Open **Admin → AI Prompt Manager** using the platform-specific Admin route.
2. Confirm the displayed platform and `/p/<platform-route>` are correct.
3. Edit or add Role, Job, Output, Language, Safety, and Escalation sections.
4. Press **Save & activate runtime**.
5. Confirm the active runtime version increases and the hash changes.
6. Open **Preview exact runtime** and verify every enabled section is present.
7. Review compiler warnings for empty, missing, duplicate-priority, or clipped
   sections.
8. Open **Admin → AI Diagnostics** and run a meaningful test question. The test
   always receives a new session.
9. Open **Admin → Chat Logs** and verify runtime version, hash, section count,
   and any memory reset reason.

## Recommended production AI settings

```text
AI_MODE_ENABLED=true
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_KEY=<secret current key with available quota>
```

In **Admin → AI Reliability**, use **Prompt-first, one AI call** and keep
**Require an approved source for every answer** off when the assistant should
answer general questions under its Role and Job.

## Verification commands

```bash
npm --prefix backend-api run check
npm --prefix backend-api run test:prompt-runtime
npm --prefix backend-api run test:chat-reliability
npm --prefix backend-api run test:regression
npm --prefix backend-api run test:knowledge-import
npm --prefix backend-api run test:security
npm --prefix backend-api run test:structured
npm --prefix backend-api run test:upload
npm run typecheck:all
npm run build:all
```

The PostgreSQL/API integration suite requires a disposable database whose name
contains `test`:

```bash
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bdg_integration_test npm run test:integration
```

## Windows installation

1. Extract `BDG-v1154-prompt-runtime-versioning-repair.zip`.
2. Double-click `START-HERE-V1.15.4-PROMPT-RUNTIME-VERSIONING-REPAIR.bat`.
3. Wait for `V1.15.4 PROMPT RUNTIME AND VERSIONING REPAIR INSTALLED AND VERIFIED`.
4. Open GitHub Desktop, review every changed file, commit, and push `main`.
5. Follow `DEPLOYMENT_CHECKLIST_V1.15.4.md`.

The installer defaults to
`C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT`. You may set the
`BDG_TARGET` environment variable or pass another repository path as the first
installer argument. It creates a rollback backup and never commits, pushes,
deploys, or reads production secrets.
