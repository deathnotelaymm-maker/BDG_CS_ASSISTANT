# v1.15.3 deployment checklist

1. Extract `BDG-v1153-prompt-first-ai-repair.zip` into `C:\BDG-v1153`.
2. Double-click `START-HERE-V1.15.3-PROMPT-FIRST-AI-REPAIR.bat`.
3. Wait for `V1.15.3 PROMPT-FIRST AI REPAIR INSTALLED AND VERIFIED`.
4. Open `C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT` in GitHub
   Desktop, press `Ctrl+R`, and review all changes.
5. Confirm no `.env`, secret, `node_modules`, `dist`, `.wrangler`, or production
   data file appears in GitHub Desktop.
6. Commit `v1.15.3 Prompt-First AI Repair` and push `main`.
7. Confirm GitHub Actions passes 56 source regressions, the 6 AI reliability
   checks, security/import/structured/upload suites, all TypeScript checks, and
   the PostgreSQL/API integration suite.
8. Confirm Render migration 035 applies once and the health version becomes
   `1.15.3-prompt-first-ai-repair`.
9. In Render, confirm:
   - `AI_MODE_ENABLED=true`
   - `DEEPSEEK_API_BASE=https://api.deepseek.com`
   - `DEEPSEEK_MODEL=deepseek-v4-flash`
   - `DEEPSEEK_API_KEY` contains a current key with available balance/quota.
10. In Admin → AI Reliability → AI Provider, enable AI, choose
    `deepseek-v4-flash`, and keep **Require an approved source for every answer**
    off for prompt-governed general questions.
11. Choose **Prompt-first, one AI call**, set 2 retries and a 12,000 ms timeout,
    save both cards, then press **Run safety test**.
12. Do not continue until `provider connection: responded` is green. A 401 means
    the key is wrong; 402 means balance/payment; 429 means rate limiting; a 400
    usually means model or request configuration.
13. In Prompt Manager, configure and enable at least Role, Job, Response Policy,
    Language Rules, Safety Rules, and Escalation Rules.
14. For an image answer, publish and approve the FAQ/AI Q&A/Guide for the active
    platform and attach its image. The image appears only when the model selects
    that exact approved source.
15. Test one general question and one known image-backed support question.
    Confirm `prompt_first_general_answer` and `prompt_first_grounded_answer` in
    Chat Logs.

The deliberate `PLATFORM_CONTEXT_MISMATCH` entry in CI is an expected negative
hostname-security assertion. It is not a release failure when the suite
continues past that request.
