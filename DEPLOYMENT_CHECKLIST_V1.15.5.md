# Deployment Checklist — v1.15.5

## 1. Before installation

- Confirm the repository is currently v1.15.4-r2.
- Pull the latest `main` branch.
- Confirm there are no uncommitted production changes.
- Export or snapshot the Neon production database.
- Record the current Render release and all three Cloudflare Pages deployments.
- Confirm Render has the existing DeepSeek, Neon, authentication, CORS, and R2
  secrets. Do not paste secrets into the repository.

## 2. Install locally

1. Extract `BDG-v1155-simplified-ai-production-runtime.zip`.
2. Run `START-HERE-WINDOWS.bat`.
3. Confirm the installer creates a rollback backup.
4. Confirm the installer reports the v1.15.5 markers and migration 037.
5. Open GitHub Desktop and inspect every changed file.

Suggested commit:

```text
v1.15.5 Simplified AI Production Runtime
```

## 3. Local verification

With dependencies installed:

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

With a disposable PostgreSQL database whose name contains `test`:

```bash
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bdg_release_test npm run test:integration
```

## 4. Recommended staging deployment

Deploy to staging before production when available:

1. Deploy backend and run migration 037.
2. Confirm `/health`, `/health/ready`, and `/health/dependencies`.
3. Deploy Admin, Chat, and Guide.
4. Open the same platform route in Admin and Chat.
5. Keep conversation memory off.
6. Publish one verified Menu & Images test item.
7. Run Burmese and English fresh-session tests.
8. Confirm old AI API routes return HTTP 410.
9. Confirm no Q&A, imported knowledge, FAQ, or Guide source appears in AI
   diagnostics.

## 5. Production deployment order

Use the existing GitHub workflow **BDG Production Release**.

The release should:

1. install backend dependencies;
2. run syntax, regression, prompt-runtime, simplified-AI, reliability, security,
   structured-response, upload, and integration tests;
3. wait for the matching Render release marker;
4. build and publish Guide;
5. build and publish Chat;
6. build and publish Admin;
7. verify live Pages release markers.

Do not deploy Pages against an older backend marker.

## 6. Production acceptance tests

### Assistant Setup

- Confirm Admin navigation shows only Assistant Setup, Menu & Images,
  Test & Diagnostics, and Buttons (Optional).
- Confirm the active runtime contains every enabled section.
- Save a harmless test change and confirm the runtime hash changes.
- Restore the intended prompt after testing.

### Menu & Images

- Confirm draft/unapproved items do not appear in the test catalog.
- Confirm approved published items do appear.
- Confirm an approved image is attached only when its item is selected.
- Confirm prices, availability, delivery terms, and payment methods match the
  stored menu item.

### Language

- Ask a Burmese question without manually selecting a locale.
- Confirm the response language is Burmese.
- Test `Automatic` in the Menu & Images tester.

### Retired modules

Confirm these old API paths return HTTP 410:

```text
/admin/knowledge-imports
/admin/ai-qa
/admin/ai-source-router
/admin/locale-studio
/admin/ai-quality/overview
```

### Diagnostics

Confirm each AI response reports:

- runtime mode `assistant_profile_menu_image`;
- workflow `prompt_first`;
- prompt runtime version and hash;
- candidate catalog count;
- selected source type `prompt_image` or no source;
- memory-reset reason when applicable;
- provider attempts and resolution path.

## 7. Initial production settings

Recommended first-day values:

```text
Conversation memory: OFF
Temperature: 0.2
Max tokens: 1200
Retries: 1
Provider timeout: 12000 ms
Fallback: Clarify, then human
```

After 24–48 hours of successful fresh-session testing, enable memory and monitor
prompt-aware resets and response quality.

## 8. Monitoring

For the first seven days, monitor:

- Render errors and restart events;
- migration status;
- provider failures, timeout rate, and retry count;
- `AI_MODULE_RETIRED` requests from stale Admin clients;
- unmatched questions;
- incorrect menu matches;
- responses without expected images;
- latency and degraded-response rate;
- tenant/platform mismatch errors.

## 9. Rollback

Application rollback:

1. stop further deployments;
2. restore the installer-created repository backup or revert the commit;
3. redeploy the previous known-good release;
4. do not edit or delete migration 037;
5. inspect archived Q&A and disabled router rows before any intentional
   reactivation.

Because migration 037 preserves historical tables and archives rather than
deletes Q&A rows, data recovery remains possible.

## 10. Later cleanup recommendation

After at least one stable production cycle, consider a separate release to:

- remove unreachable legacy functions and Admin API client methods;
- remove Excel import dependencies if no other feature needs them;
- export and drop retired tables only after an approved retention period;
- split AI runtime code out of `core.js` into dedicated modules.

Do not combine destructive cleanup with the first production simplification.
