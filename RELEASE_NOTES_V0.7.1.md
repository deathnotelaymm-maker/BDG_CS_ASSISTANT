# v0.7.1 — Admin Stability Core + Reliable AI Fallback

## Fixed

- Site Content now updates by immutable `block_key` instead of the numeric database row ID.
- Removed unsupported locale controls from the Site Content editor.
- Chat Logs now displays the real API fields in a read-only investigation view.
- Theme Settings now exposes and preserves all chat branding fields during partial updates.
- Theme and chat-content changes publish without the previous public cache delay.
- DeepSeek retries once only for timeout, network, rate-limit, and temporary provider failures.
- Approved intent content is used as the first fallback instead of an unrelated clarification message.
- Chat logs now record provider result, error category, latency, request ID, intent, confidence, and attachment decision.
- Smart Match Test now returns its selected intent, runner-up, confidence gap, decision, missing details, attachment decision, and preview.
- Dashboard service labels are based on the authenticated system-health endpoint instead of hard-coded success values.

## Database

Apply `backend-api/migrations/002_v0.7.1_admin_stability_reliable_fallback.sql` through the normal pre-deploy migration command. The runtime bootstrap is also idempotent and adds the same columns safely.

## Compatibility

- Backend: Render Node.js 22–24 with Neon PostgreSQL.
- Admin, Chat, Guide: Cloudflare Pages.
- Guide Page behavior and public guide data model remain unchanged.

## Validation

- Backend syntax: PASS
- v0.7.1 regression suite: 10/10 PASS
- Admin production build: PASS
- Chat production build: PASS
- Guide production build: PASS

The existing large-chunk warnings remain non-blocking.
