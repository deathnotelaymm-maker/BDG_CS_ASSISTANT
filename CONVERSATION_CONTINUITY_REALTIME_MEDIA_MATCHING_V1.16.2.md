# v1.16.2 Conversation Continuity and Media Matching

## Customer experience contract

The customer must not need to refresh to receive an AI reply, staff reply,
assignment change, or support resolution. WebSocket is the fastest path, while
a PostgreSQL-backed sequence sync is the guaranteed recovery path.

The public header uses the platform brand. Internal implementation details are
not customer-facing. A provider failure is a failed job, not a closed
conversation.

## Delivery contract

- Save first.
- Acknowledge with stable IDs.
- Broadcast the persisted record.
- Reconcile by message sequence.
- Deduplicate by event ID, message ID, and client message ID.
- Restore current state from PostgreSQL after reconnect or refresh.

## Resume contract

- Resume identity is platform scoped.
- Resume secrets are hashed and rotated.
- Realtime tickets are short-lived and single-use.
- Expired realtime tickets are replaced automatically.
- Legacy support tokens are rollout compatibility only.

## Media contract

- Only published, approved, non-deleted, tenant/platform-scoped Menu & Images
  records are eligible.
- The backend selects the content and media.
- The provider returns plain text only.
- Selection diagnostics are stored on the AI job.
- A missing match does not prevent a general Assistant Setup answer.

## Human-resolution contract

When staff resolves and return-to-brand is enabled:

1. assignment is released;
2. transfer requests are closed;
3. handling duration is finalized;
4. control returns to the automated support path;
5. a resolution event is broadcast;
6. sync exposes the new version/state;
7. the next customer message is accepted without refresh.
