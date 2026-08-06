# Technical Analysis — v1.17.0

## Problem

The v1.16.x Human Support foundation provided queues, staff accounts, presence,
transfers, and realtime text messaging, but daily operations remained split
between a basic Admin tab view and a limited Staff interface. Staff could not
complete the full workflow independently, customer/device context was limited,
quick replies were absent, and attachment controls were not governed by the
AI-versus-human conversation state.

## Decision

Extend the existing support foundation rather than create another chat system.
Admin and Staff receive aligned professional workspace experiences backed by the
same conversations, assignments, messages, permissions, and event streams.
Permanent state remains in PostgreSQL; R2 stores attachment and promotional
media bytes.

## Staff self-acceptance

Acceptance remains a backend transaction/conditional ownership operation. A
staff member must be Active, platform-scoped, permitted, and the conversation
must still be waiting. A competing request receives an assignment conflict.
The browser is not trusted to determine ownership.

## Attachment lifecycle

1. The backend resolves tenant, platform, conversation, actor, and permission.
2. Customer uploads additionally require HUMAN control and an assigned staff
   member; staff uploads require current ownership.
3. The server validates configured size and MIME allowlist.
4. PNG, JPEG, WEBP, and PDF content signatures are checked; plain text is
   constrained as an allowlisted text type.
5. The server generates a safe filename, SHA-256, and opaque R2 key.
6. Attachment metadata and the corresponding immutable support message are
   stored.
7. SSE broadcasts the saved message; HTTP catch-up remains available.

No malware-scanning engine is bundled. `scan_status` starts at `pending`; this
is intentionally not represented as a clean antivirus result.

## Quick-reply scopes

`support_quick_replies` separates platform and personal ownership. Platform
replies have no staff owner and require management permission. Personal replies
require an owner profile and may be changed only by that owner or an authorized
Admin path. Archived records remain available for audit/history without being
returned as active shortcuts.

## Customer context

`support_customer_context` records diagnostic client context independently from
messages. Permission checks control exposure of device and IP fields. IP-derived
region values are approximate and must not be treated as precise location.

## Promotional carousel

Promotional items are separate from support messages. They do not enter the
conversation timeline, reply counts, or AI context. Chat Theme controls own
presentation. Active human support can suppress the carousel to keep the
workspace focused.

## Realtime model

- SSE: permanent customer/staff/Admin conversation events.
- HTTP catch-up: database-backed recovery after message sequence.
- WebSocket: presence, heartbeat, typing, and transient staff state.
- PostgreSQL: conversations, messages, assignments, quick replies, context,
  attachment metadata, and promotions.
- R2: uploaded bytes.

Immediate broadcasts remain process-local. Render must stay at one backend
instance until a shared Redis-compatible event backplane is deployed.
