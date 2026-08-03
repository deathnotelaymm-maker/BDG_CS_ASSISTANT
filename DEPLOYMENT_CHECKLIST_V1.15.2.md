# v1.15.2 deployment checklist

1. Extract `BDG-v1152-ai-response-reliability-repair-r3.zip` into `C:\BDG-v1152-r3`.
2. Double-click `START-HERE-V1.15.2-AI-RELIABILITY-REPAIR.bat`.
3. Wait for `V1.15.2 AI RESPONSE RELIABILITY REPAIR INSTALLED AND VERIFIED`.
4. Open `C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT` in GitHub
   Desktop and review every changed file. Confirm the visible install marker is
   present.
5. Confirm no `.env`, secret, `node_modules`, `dist`, `.wrangler`, or production
   data file is in the Changes tab.
6. Commit `v1.15.2 AI Response Reliability Repair` and push `main`.
7. Confirm the production workflow passes syntax, 51 source regressions,
   workbook/security/reliability/structured/upload suites, all three TypeScript
   checks, the PostgreSQL integration suite, and dependency audit.
8. Confirm migration 034 is applied once and all historical migration checksums
   match. Never edit an already-applied migration.
9. Confirm Render reports `1.15.2-ai-response-reliability-repair` at
   `/health/live` and `/health/ready` before Pages deployment begins.
10. In **AI Reliability Policy**, confirm retries and timeout are appropriate.
    Recommended initial production values: 2 retries and 12,000 ms provider
    timeout. The total provider deadline remains 20 seconds.
11. In **AI Source Router**, confirm “Exact/base, then platform default.” Use
    exact-only only when every enabled customer locale has complete published
    content.
12. Configure a real HTTPS handoff URL if customers should receive a support
    button on unknown/degraded turns.
13. Test these Indonesian messages in production: `halo`, `lol`, a rude phrase,
    and one real support question backed only by an English published FAQ.
14. Temporarily use the Admin AI test with a harmless known question and confirm
    `response_status=success`, `resolution_path=model_grounded_answer`, and a
    selected source.
15. Run an AI Response Quality suite. A provider-disabled or degraded result
    must fail instead of silently passing.
16. Inspect Render for `ai_chat_completed`. Confirm prompt characters stay under
    52,000, provider attempts are recorded, and no customer message or secret is
    present in that event.
17. Keep the installer backup until the production smoke test is complete.

Do not add a CI bypass for platform-context mismatch. The disposable integration
test must pass the shared Pages route and reject the deliberately unmapped custom
hostname.
