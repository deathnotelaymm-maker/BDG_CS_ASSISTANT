# Deployment Checklist — v0.7.1

1. Back up the Neon database and the deployed v0.7.0a source.
2. Apply the v0.7.1 patch to a clean v0.7.0a source tree.
3. Configure Render with the existing pooled `DATABASE_URL`, direct `MIGRATION_DATABASE_URL`, DeepSeek, R2, admin, JWT, and allowed-origin secrets.
4. Run `npm ci`, `npm run migrate`, `npm run check`, and `npm run test:regression` in `backend-api`.
5. Deploy the backend to Render and verify `/health/live`, `/health/ready`, and `/health/dependencies`.
6. Build Admin, Chat, and Guide using the deployed Render API URL.
7. Deploy the three `dist` directories to their existing Cloudflare Pages projects.
8. In Admin, verify Site Content save/reload, all Theme fields, Chat Logs, Smart Match Test, and System Health.
9. In Chat, test a successful DeepSeek reply, a matched approved fallback, an unknown-question fallback, and correct guide-image timing.
10. Confirm the Guide Page remains unchanged and loads published content.

Do not deploy the AI rich-response enhancement in the same production change. It belongs to the later v0.8.0 release.
