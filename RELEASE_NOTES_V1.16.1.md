# BDG v1.16.1 Release Notes

## Release

**Plain-Text AI Worker and Realtime Delivery Repair**

- Base: v1.16.0-r5
- Version: 1.16.1
- Marker: `1.16.1-plain-text-ai-worker-realtime-delivery`
- Migration: `039_v1.16.1_plain_text_ai_worker_realtime_delivery.sql`
- Next migration: `040`

## Customer-visible improvements

Customer messages are stored and acknowledged immediately instead of keeping
the browser request open while DeepSeek responds. Chat shows a temporary,
platform-admin-managed processing indicator and replaces it with the saved AI
answer when the WebSocket event arrives.

Customers and staff receive messages without refreshing. Reconnecting clients
request every message after their last sequence number, so temporary network
loss does not require a manual reload.

## AI reliability changes

DeepSeek now returns only the final customer-facing answer as plain text. The
server owns all structured decisions:

- approved Menu & Images retrieval;
- image and button attachment;
- job status and retries;
- conversation control mode;
- handoff enablement and deterministic trigger rules;
- tenant/platform validation;
- message IDs and ordering.

This removes model-output failures caused by malformed JSON, missing fields,
invalid content IDs, enum drift, code fences, or truncated JSON.

The durable queue performs up to three provider attempts. Each background
provider attempt may run for up to 30 seconds. Retry state is visible in Admin
but customers receive only friendly configured waiting/failure text.

## Human-support behavior

When handoff is disabled, the backend enforces all of the following:

- no Contact Customer Service button;
- no queue creation;
- no provider-error escalation;
- no automatic recommendation to contact staff or official support.

When human control begins, queued jobs become `CANCELLED` and running jobs
become `SUPPRESSED`. Their late responses are never added to the visible chat.

The default Resolve action releases ownership and restores `control_mode=AI`.
The customer receives the resolution event immediately and can continue with
AI without starting a new conversation.

## Realtime protocol

Added or completed events include:

```text
support:sync
support:snapshot
support:message_created
support:message_state
support:delivered
support:read
ai:job_queued
ai:processing_started
ai:processing_updated
ai:message_created
ai:processing_failed
ai:processing_cancelled
support:conversation_resolved
```

All conversation messages have a monotonically increasing
`message_sequence`. Browser submissions use `client_message_id` idempotency.

## Staff Console

The Staff Console now has Dashboard, Chats, Archive, and Performance areas. The
Chats workspace uses waiting/mine/team/transferred/resolved lists, a unified
AI-and-human timeline, and a customer/conversation information panel.

## Admin

Customer Service adds queue-health cards, an AI Delivery job table, and Admin
controls for processing messages, delays, concurrent queued messages,
provider-failure text, and return-to-AI resolution behavior.

## Operational boundary

The PostgreSQL queue can recover stale processing jobs after a backend restart.
For v1.16.1, keep one Render backend instance because realtime broadcasts are
still process-local. Horizontal scaling requires a shared Redis-compatible
event backplane.
