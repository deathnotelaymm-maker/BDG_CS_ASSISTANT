# Technical Analysis — v1.16.4

## Problem

The previous customer transport relied primarily on WebSocket delivery. The
durable worker could complete and store an answer while the browser missed the
live event, requiring HTTP synchronization or a refresh before the customer saw
it.

## Decision

Use a one-way streaming transport for permanent server-to-client events:

- HTTP POST remains the authoritative send path.
- SSE becomes the primary receive path.
- PostgreSQL remains the source of truth.
- HTTP sequence catch-up remains mandatory.
- WebSocket is retained only for bidirectional transient staff presence and
  typing signals.

This avoids replacing the restart-safe AI queue with a fragile direct provider
stream. The provider can still retry in the background while the customer
receives job and message state through the conversation stream.

## Backend implementation

`support-service.js` exposes platform-scoped customer and staff SSE endpoints.
Each stream authenticates the caller, loads a database snapshot, subscribes to
the support event bus, filters events by platform and conversation, emits
heartbeats, and cleans up on request abort.

`server.js` detects `text/event-stream` responses and pipes the Web `ReadableStream`
to the Node response without buffering the complete body.

## Failure behavior

When SSE is interrupted, the clients continue calling the existing ordered HTTP
sync endpoints. No permanent event exists only in memory. Reconnection uses the
latest saved message sequence, so duplicate events are ignored by message ID
and missed events are replayed from PostgreSQL.

## Known production boundary

Immediate event broadcast remains process-local. Multiple Render instances
would not share the in-memory event emitter. A Redis-compatible pub/sub
backplane is required before horizontal scaling. Database catch-up remains safe
but would add delivery latency between instances.
