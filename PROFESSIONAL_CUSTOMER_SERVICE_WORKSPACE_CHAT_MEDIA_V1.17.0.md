# Professional Customer Service Workspace & Chat Media — v1.17.0

## Final architecture

```text
Customer Chat
  ├── Automated support: text only
  └── Human support: text + approved image/file uploads

Staff Console
  ├── Waiting queue and atomic self-accept
  ├── Active, team, transferred, and resolved conversations
  ├── Reply, internal note, attachment, transfer, and resolve actions
  ├── Conversation/customer context
  └── Platform and personal quick replies

Admin Customer Service Center
  ├── Professional conversation workspace
  ├── Staff account and assignment controls
  ├── Platform quick replies
  ├── Promotional carousel management
  ├── Attachment and handoff settings
  ├── Performance and AI delivery diagnostics
  └── Audit history
```

Permanent messages and attachment metadata are stored in PostgreSQL. Media
bytes use the existing R2 binding. SSE carries permanent conversation events,
HTTP sequence synchronization repairs missed events, and WebSocket remains for
staff presence and typing.

## Staff self-acceptance

A waiting conversation may be accepted by an Active permitted staff member.
The backend updates ownership conditionally, so competing acceptance attempts
cannot both succeed. Non-owners remain read-only until transfer or reassignment.

## Human-only customer attachments

The customer interface exposes upload controls only while:

- the platform enables customer attachments;
- the conversation is in HUMAN control mode;
- a staff member is assigned; and
- the conversation is active.

The backend enforces the same rule. Hiding the control in the browser is not the
security boundary. When staff resolves and returns the customer to automated
support, customer upload controls disappear.

## Attachment policy

The initial allowlist is:

- `image/png`
- `image/jpeg`
- `image/webp`
- `application/pdf`
- `text/plain`

The default maximum size is 10 MB. The server validates allowed MIME type,
content signature where applicable, size, filename normalization, and SHA-256.
Storage keys are opaque and scoped by tenant, platform, and conversation.

No malware-scanning service is bundled. Attachment records remain
`scan_status = pending` unless a future scanner updates them. Production teams
with higher-risk document workflows should connect a malware scanner before
expanding the allowlist.

## Customer context and privacy

The workspace can show permission-controlled context such as masked IP,
approximate region when available, device type, operating system, browser,
current page, and referrer. This information is diagnostic, not precise
geolocation. Platforms should disclose collection, restrict permissions, and
apply a minimal retention period.

## Quick replies

- Platform replies are managed by Admin and available to permitted staff.
- Personal replies belong only to their staff owner.
- Quick replies contain plain text and controlled metadata; they are not
  executable templates.

## Promotional Chat carousel

Admin can manage promotional cards and Chat Theme controls for placement,
autoplay, timing, loop, indicators, arrows, heights, and radius. Promotions use
HTTPS destinations and may be hidden automatically during active human support.
They are presentation content, not support messages, and do not affect staff
reply metrics or conversation history.

## Staff domain mapping

Domain Mapping now includes Staff Console beside Admin, Chat, and Guide. Staff
custom domains use the site root without a platform-route suffix. The generated
Staff Pages origin must remain allowed by backend CORS.
