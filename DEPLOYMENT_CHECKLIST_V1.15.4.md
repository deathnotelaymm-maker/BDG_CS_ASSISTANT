# v1.15.4 deployment checklist

## Install and review

1. Extract `BDG-v1154-prompt-runtime-versioning-repair.zip`.
2. Double-click
   `START-HERE-V1.15.4-PROMPT-RUNTIME-VERSIONING-REPAIR.bat`.
3. Wait for
   `V1.15.4 PROMPT RUNTIME AND VERSIONING REPAIR INSTALLED AND VERIFIED`.
4. Open the target repository in GitHub Desktop and press `Ctrl+R`.
5. Review every changed file. Confirm `.env`, secrets, `node_modules`, `dist`,
   `.wrangler`, production exports, and database dumps are absent.
6. Commit `v1.15.4 Prompt Runtime and Versioning Repair` and push `main`.

## CI and deployment

7. Confirm GitHub Actions passes backend syntax, 62 source regressions, 5 prompt
   runtime checks, 6 reliability checks, all existing backend suites, all three
   TypeScript checks/builds, and PostgreSQL/API integration.
8. Confirm Render pre-deploy applies migration 036 exactly once.
9. Confirm Render health returns
   `1.15.4-prompt-runtime-versioning-repair`.
10. Confirm migration 036 appears in `schema_migration_files` with a 64-character
    SHA-256 checksum. Never edit migration 036 after this point.
11. Confirm Cloudflare Pages deploys Admin, Chat, and Guide from the same commit.

## Runtime configuration

12. In Render, confirm:
    - `AI_MODE_ENABLED=true`
    - `DEEPSEEK_API_BASE=https://api.deepseek.com`
    - `DEEPSEEK_MODEL=deepseek-v4-flash`
    - `DEEPSEEK_API_KEY` contains a current secret key with quota.
13. In **Admin → AI Reliability**, select **Prompt-first, one AI call**.
14. Keep **Require an approved source for every answer** off when general answers
    are expected under the Role and Job.

## Prompt verification

15. Open the platform-specific Admin route and **AI Prompt Manager**.
16. Confirm the displayed platform name and `/p/<platform-route>` match Chat.
17. Record the current active runtime version and hash.
18. Add or edit a small test Output instruction, for example:
    `Start every answer with TEST-V154.`
19. Save it and confirm the runtime version increases and the hash changes.
20. Open **Preview exact runtime** and confirm Role, Job, Output, Language,
    Safety, and other enabled sections are all present.
21. Resolve any clipping or empty-section warnings.
22. Open **AI Diagnostics** and ask a meaningful question. Do not test only with
    a cached browser session.
23. Confirm the test shows the new runtime version/hash and fresh memory.
24. Open public Chat and ask one general question and one approved image-backed
    question.
25. Confirm Chat Logs show:
    - `prompt_first_general_answer` or `prompt_first_grounded_answer`;
    - the new prompt runtime hash;
    - all expected section IDs;
    - a memory reset reason on the first old session request after publication;
    - one approved image only for the matched approved source.
26. Remove the temporary TEST-V154 instruction, save again, and confirm another
    runtime version/hash is activated.

## Rollback

The installer prints and records a complete pre-install backup path. If review
or deployment fails, stop deployment and restore that backup. If migration 036
has already applied, do not delete or edit its registry row; deploy a forward
repair with migration 037 instead.
