# v0.10.1 — Mobile Image Viewer + AI Observability & FAQ Control

## Delivered

- Full-screen mobile image viewer for Chat response images and Guide content images.
- Zoom in, zoom out, reset, Escape/close, background scroll lock, and mobile pinch-zoom support.
- Admin FAQ form now exposes the persisted answer, keywords, priority, and publish status.
- FAQ answers remain bound to the existing backend `/admin/faqs` and public `/faqs` contracts.
- AI confidence values accept both `0.95` and `95`, storing an integer percentage from 0–100.
- Chat-log write failures are isolated and cannot replace a valid AI reply with HTTP 500.
- AI Diagnostics now reports recent provider failures/fallbacks, request IDs, intent, confidence, latency, and error detail.
- Chat Logs show readable status labels and the AI routing decision, intent, desired outcome, confidence, and reason.
- Admin favicon uses `backend.png`; Chat favicon uses the supplied `headset.png`.

## Verification

- Backend syntax checks passed.
- Admin, Chat, and Guide production builds passed.
- 41/41 regression checks passed.
- 4/4 structured-response checks passed.
- 4/4 R2 upload checks passed.

## Deployment state

Artifacts are built and locally validated. They do not automatically push to GitHub or deploy production.
