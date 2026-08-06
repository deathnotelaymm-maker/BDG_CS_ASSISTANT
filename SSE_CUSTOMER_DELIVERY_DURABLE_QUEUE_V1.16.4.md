# v1.16.4 — SSE Customer Delivery and Durable Queue Integration

## Final transport model

```text
Customer sends with HTTP POST
        ↓
PostgreSQL stores the customer message and durable AI job
        ↓
HTTP 202 Accepted returns immediately
        ↓
Authenticated SSE delivers saved conversation events
        ↓
HTTP sequence catch-up repairs any missed event
```

The durable AI worker, plain-text DeepSeek output, server-selected Menu & Images,
and Human Support control rules remain authoritative. SSE changes delivery, not
business ownership or persistence.

## Transport responsibility

- Customer permanent events: authenticated SSE.
- Staff permanent conversation events: authenticated SSE.
- Staff presence and typing: authenticated WebSocket.
- Recovery after interruption: PostgreSQL sequence catch-up over HTTP.
- Permanent messages and AI jobs: PostgreSQL only.

## SSE event contract

Customer and staff streams use named events:

- `session`
- `message.created`
- `response.queued`
- `response.processing`
- `response.completed`
- `response.failed`
- `response.cancelled`
- `message.state`
- `conversation.assigned`
- `conversation.resolved`
- `conversation.typing`
- `heartbeat`

Internal provider names, model names, router names, and worker errors are never
sent as customer-facing stream events.

## Recovery behavior

Clients reconnect with the last received message sequence. The stream begins
with a PostgreSQL snapshot containing any saved messages after that sequence.
An independent HTTP synchronization loop remains active at a slower safety
interval while SSE is healthy and a faster interval while SSE is unavailable.

## Scaling boundary

The SSE event bus is process-local. Keep the Render backend at one instance for
v1.16.4. PostgreSQL recovery prevents data loss, but immediate cross-instance
broadcast requires a Redis-compatible backplane before horizontal scaling.
