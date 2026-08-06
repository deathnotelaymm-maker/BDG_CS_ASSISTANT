# v1.17.0 — Professional Customer Service Workspace & Chat Media Upgrade

v1.17.0 turns the Human Support foundation into a production-oriented customer
service workspace for both Staff and Admin. It adds staff self-acceptance,
permission-aware customer context, human-only attachments, platform and personal
quick replies, Staff Console domain mapping, and promotional Chat carousel
controls while preserving the durable AI worker, SSE message delivery, HTTP
catch-up, and WebSocket presence/typing introduced in earlier releases.

Release marker: `1.17.0-professional-support-workspace-chat-media`

## Production flow

```text
Customer uses automated support
      ↓
Human handoff enters the waiting queue
      ↓
Any Active permitted staff member may accept atomically
      ↓
Customer and staff exchange stored text, images, and approved files
      ↓
Staff resolves and returns the customer to brand support
```

Customer upload controls are available only while an assigned human
representative actively owns the conversation. They disappear when control
returns to automated support.

## Applications

- `admin-pro`: professional Customer Service workspace, staff management,
  platform quick replies, promotions, attachment policy, reports, and audit.
- `staff-pro`: waiting queue, self-accept, active conversations, team view,
  personal/platform shortcuts, attachments, transfers, and resolution.
- `chat-pro`: human-mode customer uploads and promotional carousel rendering.
- `backend-api`: tenant-safe permissions, attachment validation and storage,
  customer context, quick replies, promotional items, and support events.

## Attachment boundary

Initial allowed types are PNG, JPEG, WEBP, PDF, and plain text, with a default
10 MB limit. The backend validates size, extension-independent MIME/signature,
records SHA-256, and stores tenant/platform-scoped metadata. Migration `043`
leaves `scan_status` as `pending`; no malware-scanning engine is bundled in this
release.

## Migration

```text
backend-api/migrations/043_v1.17.0_professional_support_workspace_media_quick_replies.sql
```

Do not modify migration `043` after deployment. The next migration is `044`.

## Deployment

Follow `DEPLOYMENT_CHECKLIST_V1.17.0.md`. Keep Render at one backend instance
until a Redis-compatible event backplane is added for cross-instance SSE and
WebSocket delivery.
