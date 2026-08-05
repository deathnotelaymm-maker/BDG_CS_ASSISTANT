# Technical Analysis — v1.16.1

## Problems repaired

### Synchronous browser/provider coupling

The old `/chat` request waited for prompt loading, source loading, provider
latency, output parsing, logging, and final response generation. A timeout or
provider delay became a browser-visible failure.

v1.16.1 saves the customer message and AI job in one database transaction and
returns HTTP 202 immediately. Provider work runs outside the request lifecycle.

### Strict model JSON

The old model response carried customer text and internal control data in one
strict JSON object. Readable provider output could be rejected because of a
missing key, invalid enum, invalid source ID, surrounding prose, or truncation.

The provider boundary is now plain text. Internal application state remains
structured and server-controlled.

### Refresh-dependent live chat

The browser previously depended too heavily on REST reloads. v1.16.1 assigns a
sequence to every message, broadcasts saved rows, and synchronizes missed rows
on reconnect.

## Durable queue

`ai_jobs` is the permanent queue and audit record. Workers claim rows with
PostgreSQL transaction locking and `SKIP LOCKED`. Only one job per conversation
may be actively processed. Stale `PROCESSING` rows can be reclaimed after five
minutes if a worker or deployment stops unexpectedly.

States:

```text
QUEUED
PROCESSING
RETRYING
COMPLETED
FAILED
CANCELLED
SUPPRESSED
```

`CANCELLED` means work was stopped before provider completion. `SUPPRESSED`
means a running provider result must not be published because human control or
another state transition took priority.

## Idempotency and ordering

The customer supplies a `client_message_id`. The database unique constraint on
`(conversation_id, client_message_id)` prevents duplicate messages and jobs.
Duplicates return the existing accepted result and are not rebroadcast.

`support_conversations.last_message_sequence` is incremented while the
conversation row is locked. The created message receives that exact sequence.
Clients sync using `after_sequence`.

## Approved-content architecture

The server ranks only published, approved, platform-scoped `prompt_image`
items. It sends up to three relevant candidates to DeepSeek and selects the
approved image/buttons itself. The model cannot invent or select an arbitrary
content ID.

General questions do not require a candidate. Exact business facts still must
come from approved context, as instructed by the active Assistant Setup.

## Handoff enforcement

The provider returns no handoff enum. Deterministic backend rules and platform
settings decide whether a button may appear. When handoff is disabled, a final
server policy removes support-recommendation wording from the provider reply.

## Security boundaries

- Customer support tokens are signed and conversation-scoped.
- Browser token storage is platform-scoped.
- Staff WebSocket access validates role, account status, session version,
  platform, permissions, and conversation access.
- Conversation and job rows carry tenant and platform IDs.
- Client platform IDs are never accepted as the security authority.
- Sent messages remain immutable.
- Internal notes are excluded from customer synchronization.

## Scaling boundary

The queue is PostgreSQL-backed and can be claimed safely by multiple workers.
The current support event bus is process-local, so multiple backend instances
would not reliably share WebSocket broadcasts. Keep one Render instance until
a Redis-compatible publisher/subscriber adapter is implemented and tested.
