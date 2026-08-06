# v1.16.4 — SSE Customer Delivery and Durable Queue Integration Repair

v1.16.4 keeps the durable PostgreSQL AI worker introduced in v1.16.1 and
changes permanent customer/staff event delivery to authenticated Server-Sent
Events (SSE). HTTP message-sequence catch-up remains mandatory, while WebSocket
is retained for staff presence and typing.

Release marker: `1.16.4-sse-customer-delivery-durable-queue`

## Production flow

```text
Customer POSTs one question
      ↓
PostgreSQL stores the message and durable AI job
      ↓
HTTP 202 returns immediately
      ↓
SSE delivers processing and saved-message events
      ↓
HTTP sequence catch-up repairs missed events
```

DeepSeek still returns plain text. The server still chooses approved Menu &
Images, controls handoff, and prevents a second pending question.

## Transport responsibilities

- Customer permanent events: SSE.
- Staff permanent conversation events: SSE.
- Staff presence and typing: WebSocket.
- Recovery: HTTP synchronization after the last saved sequence.
- Persistence: PostgreSQL.

## Migration

```text
backend-api/migrations/042_v1.16.4_sse_customer_delivery_durable_queue.sql
```

Do not modify migration `042` after deployment. The next migration is `043`.

## Deployment

Follow `DEPLOYMENT_CHECKLIST_V1.16.4.md`. Keep Render at one backend instance
until a Redis-compatible event backplane is introduced.
