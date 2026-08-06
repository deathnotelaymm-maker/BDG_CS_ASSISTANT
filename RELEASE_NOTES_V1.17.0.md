# Release Notes — v1.17.0

**Release:** Professional Customer Service Workspace & Chat Media Upgrade  
**Marker:** `1.17.0-professional-support-workspace-chat-media`  
**Migration:** `043_v1.17.0_professional_support_workspace_media_quick_replies.sql`

## Added

- Staff Console as an explicit Domain Mapping site type.
- Professional three-panel Staff conversation workspace.
- Professional Admin Customer Service workspace aligned with Staff operations.
- Staff self-acceptance from the shared waiting queue.
- Human-only customer image and file uploads.
- Staff and Admin attachment sending.
- Tenant/platform-scoped attachment metadata, SHA-256, and upload policy.
- Permission-aware customer IP, device, browser, page, and referrer context.
- Platform and personal Customer Service quick replies.
- Conversation and Shortcuts detail panels.
- Promotional Chat carousel records and Chat Theme controls.
- Admin Customer Service SSE stream for selected conversations.
- Attachment, quick-reply, customer-context, and Admin override permission keys.

## Changed

- Customer upload controls appear only during an assigned active human session.
- Staff may accept waiting conversations without waiting for Admin assignment.
- Admin can operate conversations through a workspace rather than only summary
  tabs and tables.
- System events use distinct visual treatment and remain excluded from reply
  statistics.
- Domain Mapping generated origins include the Staff Console.
- All application packages and release markers move to v1.17.0.

## Preserved

- Plain-text DeepSeek output and the durable PostgreSQL AI queue.
- One pending automated question per conversation.
- SSE permanent-event delivery and HTTP sequence catch-up.
- WebSocket staff presence and typing.
- Server-owned Menu & Images selection.
- Human takeover suppression and return-to-support resolution.
- Strict tenant and platform isolation.

## Security boundary

The release validates allowed attachment type, content signature, size, safe
filename, and SHA-256. It does not include a malware-scanning engine; records
remain pending until an external scanning integration is added.
