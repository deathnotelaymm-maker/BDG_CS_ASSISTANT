# Deployment Checklist — v1.16.1

## Before installation

- Confirm the working repository is v1.16.0-r5.
- Commit or back up unrelated local changes.
- Take a Neon production snapshot.
- Record the current Render release and all four Cloudflare Pages deployments.
- Confirm the Staff origin remains in `ALLOWED_ORIGINS`.
- Keep Human Support settings unchanged until the new release is verified.
- Keep the Render backend at exactly one instance.

## Install locally

1. Extract `BDG-v1161-plain-text-ai-worker-realtime-delivery-repair.zip`.
2. Run `START-HERE-WINDOWS.bat`.
3. Confirm release checksums pass.
4. Confirm the rollback backup path is displayed.
5. Confirm all installed payload files pass SHA-256 comparison.
6. Review Git changes.
7. Commit:

```text
v1.16.1 Plain-Text AI Worker and Realtime Delivery Repair
```

## CI requirements

Do not deploy manually around a failed workflow. The production workflow must
pass:

- Backend source checks and all regression suites.
- Migration 039 PostgreSQL integration tests.
- Security, upload, structured-response, and dependency audit checks.
- Admin, Chat, Guide, and Staff typechecks and production builds.
- Matching Render API release verification.
- Cloudflare Pages publication and live release-marker verification.

## Deployment order

```text
1. Render backend deploys v1.16.1
2. Migration 039 is applied
3. /health reports the v1.16.1 marker
4. Guide Pages publishes
5. Chat Pages publishes
6. Staff Pages publishes
7. Admin Pages publishes
8. Live release markers are confirmed
```

Do not use v1.16.1 Chat or Staff against an older backend.

## Required acceptance tests

### Asynchronous AI

- Send a customer message.
- Confirm `/chat` returns HTTP 202 quickly.
- Confirm the Admin-configured processing indicator appears.
- Confirm the indicator is not stored in conversation history.
- Confirm the final AI answer arrives without refresh.
- Confirm the answer is plain provider text with server-approved media.

### Realtime staff/customer delivery

- Staff sends a message; customer receives it without refresh.
- Customer replies; staff receives it without refresh.
- Open the same customer chat in two tabs and confirm both synchronize.
- Temporarily disconnect the network and confirm missed messages are restored.
- Repeat a request with the same client message ID and confirm no duplicate.
- Confirm delivery/read state updates.

### AI/human control

- With handoff OFF, confirm no support button, queue entry, or support wording.
- With handoff ON, confirm approved handoff triggers work.
- Take a conversation as staff while AI is processing and confirm the late AI
  response is suppressed.
- Resolve the conversation and confirm the customer returns to AI immediately.
- Confirm the next customer message creates a new AI job without refresh.

### Queue recovery

- Confirm Admin → Customer Service → AI Delivery shows job states.
- Restart the backend during a test job and confirm the durable job remains.
- Confirm stale work can be reclaimed and no duplicate answer is published.

### Security

- Staff cannot subscribe to another platform’s conversation.
- Customer support token cannot open another conversation.
- Internal notes never appear to customers.
- A revoked staff session disconnects and cannot send.

## Initial production settings

Recommended:

```text
Processing message enabled: ON
Show after: 700 ms
Secondary message after: 8000 ms
Maximum visible time: 90000 ms
Allow messages while AI is processing: ON
Return customer to AI after resolve: ON
Provider retries: managed by durable worker (3 total job attempts)
Human handoff: enable per platform only after acceptance testing
```

## Monitoring for the first 48 hours

Watch:

- queued and retrying job counts;
- jobs older than five minutes;
- failed or suppressed jobs;
- WebSocket reconnect frequency;
- duplicate client message IDs;
- AI messages emitted after human takeover;
- conversations not returning to AI after resolve;
- CORS failures for Chat and Staff;
- provider authentication/configuration errors.

## Rollback

Use the installer-created backup and restore application files. Coordinate the
rollback with the database snapshot. Migration 039 adds compatible columns and
tables, but never edit or delete the applied migration file. If application
rollback is required, leave migration 039 in place and restore v1.16.0-r5 code
only after confirming it ignores the additive schema safely.
