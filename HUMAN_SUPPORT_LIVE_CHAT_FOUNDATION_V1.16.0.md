# Human Support & Live Chat Foundation

## Final architecture

```text
Customer
   ↓
Prompt-first AI + approved Menu & Images
   ↓
AI answers OR offers Human Customer Service
   ↓
Waiting queue
   ↓
Active platform-scoped staff
   ↓
Transfer / Resolve
   ↓
Unified conversation history, reports, and audit
```

## Runtime boundaries

Human Support does not restore AI Q&A, Knowledge Import, configurable Source Router, Response Quality, or two-stage judge/composer routing. The active AI remains one compiled Assistant Setup prompt, approved Menu & Images, and one provider call.

## Realtime gateway

- Path: `/support`
- Staff/customer authentication: signed support tokens.
- Rooms are represented by platform, staff, and authorized conversation subscriptions.
- Maximum incoming WebSocket payload: 64 KiB.
- Default REST/WebSocket heartbeat: 30 seconds.
- Default offline timeout: 90 seconds.
- Typing indicators are ephemeral and are not stored as permanent messages.

## State authority

The backend validates state transitions. Browsers cannot freely set conversation ownership or status. Queue acceptance uses an atomic conditional update inside a transaction. Transfer acceptance changes ownership only after the target accepts and all related assignment records update within the same transaction.

## Data authority

PostgreSQL stores all permanent staff, conversation, message, assignment, transfer, presence, performance, and audit records. Timestamps use `TIMESTAMPTZ` and are displayed using platform or permitted staff IANA timezones.

## Initial production routing

Use manual shared-queue acceptance in v1.16.0. Do not enable round robin, departments, skills, ratings, voice/video, Telegram, AI staff suggestions, or salary scoring in this release.

## Scaling boundary

The event fan-out implementation is single-process. Keep one backend instance. Before adding a second backend instance, introduce a shared Redis or PostgreSQL pub/sub event backplane and distributed presence ownership.
