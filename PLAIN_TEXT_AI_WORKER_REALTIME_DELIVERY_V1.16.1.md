# v1.16.1 Runtime Architecture

## Customer-to-AI flow

```text
POST /chat
  ├─ validate platform and message
  ├─ get or create support conversation
  ├─ store immutable CUSTOMER message
  ├─ create durable ai_jobs row
  ├─ return HTTP 202 + support token + processing settings
  └─ broadcast saved customer message and queued job

AI worker
  ├─ atomically claim one eligible job
  ├─ confirm conversation remains AI-controlled
  ├─ load active Assistant Setup runtime
  ├─ rank approved Menu & Images candidates
  ├─ call DeepSeek for plain text
  ├─ confirm human control was not taken
  ├─ save immutable AI message with next sequence
  ├─ attach server-approved images/buttons in metadata
  └─ broadcast final saved message
```

## Temporary processing experience

The temporary message is an ephemeral client indicator. It is never inserted
into `support_messages` and therefore never requires deletion. Admin controls
the text and timing. On reconnect, the client restores the indicator from the
active AI job returned by `support:sync`.

## Human takeover

```text
AI_ACTIVE
  ↓ customer accepts handoff / staff assigned
HUMAN
  ├─ QUEUED or RETRYING jobs → CANCELLED
  └─ PROCESSING jobs → SUPPRESSED
```

The provider request may finish internally, but its output is discarded after
human ownership begins.

## Resolution

```text
AGENT_ACTIVE
  ↓ Resolve and return to AI
RESOLVED + control_mode=AI
  ↓ customer sends next message
AI_ACTIVE + new durable AI job
```

## Plain text versus structured transport

```text
DeepSeek output: plain text
Database rows: typed structured columns
HTTP acknowledgement: JSON
WebSocket events: JSON
Approved images/buttons: server metadata
```

This separation keeps provider output forgiving while application state stays
deterministic and secure.
