# Release Notes — v1.16.4

**Release:** SSE Customer Delivery and Durable Queue Integration Repair  
**Marker:** `1.16.4-sse-customer-delivery-durable-queue`  
**Migration:** `042_v1.16.4_sse_customer_delivery_durable_queue.sql`

## Added

- Authenticated customer conversation SSE stream.
- Authenticated staff conversation SSE stream for permanent events.
- Initial PostgreSQL snapshot and message-sequence resume.
- Heartbeat frames and proxy anti-buffering headers.
- HTTP catch-up retained as an independent recovery path.
- Admin controls for stream enablement and heartbeat interval.
- Staff typing bridged from WebSocket to customer SSE.
- Separate `response.completed` and `message.created` stream events.

## Changed

- Customer Chat no longer depends on WebSocket for permanent messages.
- Staff Console receives permanent conversation events over SSE.
- WebSocket remains for staff presence and typing.
- Customer status remains Online while HTTP recovery is healthy even if the
  primary SSE connection is reconnecting.
- All application packages and release markers move to v1.16.4.

## Preserved

- Durable PostgreSQL AI queue.
- Plain-text DeepSeek responses.
- One pending customer question per conversation.
- Server-owned Menu & Images matching and media attachment.
- Human takeover suppression and return-to-support resolution.
- Tenant and platform isolation.
