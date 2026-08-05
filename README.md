# v1.16.1 — Plain-Text AI Worker and Realtime Delivery Repair

v1.16.1 changes the production chat path from a synchronous, strict-JSON AI
request into a durable asynchronous workflow. DeepSeek now returns only the
customer-facing answer as plain text. The backend remains authoritative for
conversation state, approved Menu & Images, media attachment, handoff rules,
message ordering, delivery state, and tenant/platform isolation.

Release marker: `1.16.1-plain-text-ai-worker-realtime-delivery`

## Production conversation architecture

```text
Customer sends message
      ↓
Backend validates and stores the customer message
      ↓
Backend creates a durable PostgreSQL AI job
      ↓
HTTP 202 Accepted is returned immediately
      ↓
Chat displays an ephemeral Admin-configured processing indicator
      ↓
Background worker loads Assistant Setup and relevant Menu & Images
      ↓
DeepSeek returns plain customer-facing text
      ↓
Backend saves the final AI message and approved media
      ↓
WebSocket broadcasts the saved message
      ↓
Customer and Staff Console update without refresh
```

The processing indicator is not stored as a chat message and is removed when
the final AI message, cancellation, or failure event arrives.

## Plain-text provider boundary

Only the model output is plain text. Internal HTTP responses and WebSocket
events remain structured JSON because the application still needs reliable
message IDs, sequence numbers, job states, delivery/read state, and security
metadata.

The model no longer selects content IDs, image IDs, button IDs, handoff enums,
or routing states. The server retrieves and validates approved Menu & Images
before the provider request, then attaches only approved platform-scoped media.

## AI and human control

When Human Customer Service Handoff is disabled, the backend prevents support
buttons, queue creation, provider-failure escalation, and model wording that
recommends customer service. The AI continues with a useful answer, a focused
clarification, or the configured retry message.

When a staff member takes ownership, queued AI jobs are cancelled and running
answers are suppressed. When staff resolves the conversation, the default
behavior returns control to AI, broadcasts the state change, and lets the next
customer message enter the AI queue without refreshing.

## Realtime delivery

Every support message has a conversation-scoped sequence number. Customer and
staff clients reconnect using the last received sequence and request missed
messages. Client-generated message IDs prevent duplicate sends. Delivery and
read state are updated through authenticated WebSocket events.

## Staff Console improvements

The dedicated `staff-pro` application now includes:

- Dashboard with presence, connection, waiting queue, active conversations,
  transfer requests, daily performance, and queue status.
- Realtime three-panel Chats workspace.
- Waiting, Mine, Team, Transferred, and Resolved views.
- Owner-only reply controls, internal notes, transfer, resolve-to-AI, typing,
  delivery/read state, and reconnect catch-up.
- Archive and Performance views.

## Admin controls

Customer Service now includes an **AI Processing Experience** section for:

- processing indicator enable/disable;
- primary and secondary waiting text;
- display delays and maximum visibility;
- whether additional customer messages may queue;
- provider-failure customer text;
- return-to-AI behavior after staff resolution.

The **AI Delivery** tab displays queued, processing, retrying, completed,
failed, cancelled, and suppressed jobs for the active platform.

## Database migration

Apply:

```text
backend-api/migrations/039_v1.16.1_plain_text_ai_worker_realtime_delivery.sql
```

Migration `039` adds the durable `ai_jobs` queue, ordered message delivery,
idempotency, delivery/read timestamps, processing-experience settings, and
explicit AI/human control fields. It is immutable after production deployment.
The next migration must be `040`.

## Verification commands

```bash
npm --prefix backend-api run check
npm --prefix backend-api run test:regression
npm --prefix backend-api run test:prompt-runtime
npm --prefix backend-api run test:simplified-ai
npm --prefix backend-api run test:support
npm --prefix backend-api run test:v1161
npm --prefix backend-api run test:chat-reliability
npm --prefix admin-pro run test:customer-service-route
```

GitHub Actions additionally installs dependencies, runs PostgreSQL integration
and security suites, typechecks and builds all four frontends, audits
production dependencies, waits for the matching Render release, and publishes
Guide, Chat, Staff, and Admin to Cloudflare Pages.

## Production note

Keep the Render backend at one instance for this release. The AI queue itself
is PostgreSQL-backed and restart-safe, but the realtime event bus remains
process-local. Add a Redis-compatible broadcast backplane before horizontal
scaling.
