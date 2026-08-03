# v1.15.3 — Prompt-First AI Repair

v1.15.3 changes live Chat from a mandatory judge-then-composer chain to one
prompt-first DeepSeek request. The model follows the enabled Prompt Manager
Role, Job, Output, Language, Safety, and Escalation sections for general
questions. Approved tenant/platform content is preferred factual context, but
it does not block a general response unless approved-only mode is enabled.

Release marker: `1.15.3-prompt-first-ai-repair`

## Live response contract

- Greetings and respectful boundaries remain deterministic and provider-free.
- A normal turn uses one provider call in the default `prompt_first` workflow.
- The model can select an approved catalog item by ID. The server validates the
  ID before adding its approved buttons and at most one approved image.
- A no-match question can receive a prompt-governed general answer when
  **Require an approved source for every answer** is off.
- Empty model output is retried within the saved retry and deadline limits.
- During a provider outage, a conservative matched-source fallback can still
  return approved text and its image.
- The previous two-stage judge/composer workflow remains available as the
  optional `advanced_two_stage` mode.
- Provider errors and keys are never returned to public Chat.

No application can generate a general AI answer during a total provider, API,
database, DNS, or browser-network outage. The verified-source fallback only
works when the API and database remain available and an approved source clearly
matches the question.

## Required production configuration

Set these Render environment values:

```text
AI_MODE_ENABLED=true
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_KEY=<secret current key with available quota>
```

Migration `035_v1.15.3_prompt_first_ai_repair.sql` changes the default workflow
to prompt-first, repairs retired legacy model values, enables general
prompt-governed answers by default, and preserves custom Prompt Manager text.

After deployment, open **Admin → AI Reliability**. Save both the Provider and
Policy cards with AI enabled, `deepseek-v4-flash`, Prompt-first, 2 retries, a
12,000 ms timeout, and approved-only mode off. Then run the real provider test.
Configure and enable the desired Role, Job, Response Policy, Language, Safety,
and Escalation sections in Prompt Manager.

## Image answers

Publish and approve the FAQ, AI Q&A, or Guide for the active platform and
attach an image to it. When the model selects that exact source, the API adds
one validated approved image. The model cannot invent or inject an image URL.

## Verification

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

The destructive integration suite requires a disposable PostgreSQL database
whose database name contains `test`:

```bash
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bdg_integration_test npm run test:integration
```

It applies all immutable migrations twice and uses a deterministic local fake
provider. It does not contact production Render, Cloudflare, Neon, or DeepSeek.

## Windows installation

1. Extract `BDG-v1153-prompt-first-ai-repair.zip` to `C:\BDG-v1153`.
2. Double-click `START-HERE-V1.15.3-PROMPT-FIRST-AI-REPAIR.bat`.
3. Wait for `V1.15.3 PROMPT-FIRST AI REPAIR INSTALLED AND VERIFIED`.
4. Open GitHub Desktop, press `Ctrl+R`, review Changes, commit, and push `main`.
5. Follow [DEPLOYMENT_CHECKLIST_V1.15.3.md](DEPLOYMENT_CHECKLIST_V1.15.3.md).

The installer writes only to
`C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT`, creates a rollback
backup, and never commits, pushes, deploys, or reads production secrets.

## Release documents

- [AI workflow analysis](AI_WORKFLOW_REPAIR_V1.15.3.md)
- [Release notes](RELEASE_NOTES_V1.15.3.md)
- [Verification result](TEST_RESULT_V1.15.3.md)
- [Deployment checklist](DEPLOYMENT_CHECKLIST_V1.15.3.md)
- [Changed files](CHANGED_FILES_V1.15.3.txt)
- [Machine-readable manifest](MANIFEST_V1.15.3.json)
