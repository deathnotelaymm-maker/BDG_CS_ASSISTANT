# Technical Analysis — v1.16.2

## Problem statement

The v1.16.1 asynchronous worker correctly accepted customer messages and saved
final AI replies, but customer and staff interfaces still depended too heavily
on a continuously healthy WebSocket. When the socket was unavailable, the
saved database state became visible only after a manual refresh. Refresh also
restored an incomplete browser state, started at the top of the conversation,
and could retain stale human-control status after staff resolution.

The approved Menu & Images selector also relied too heavily on exact token and
phrase overlap, which performed poorly across Burmese, Indonesian, English,
Chinese, Hindi, spelling variants, and short conversational recommendations.

## Root causes

1. WebSocket was treated as the only immediate delivery mechanism.
2. Resume depended on support credentials rather than a stable rotating
   platform-scoped resume identity.
3. Clients did not always reconcile browser state with PostgreSQL after
   reconnect, visibility change, or staff resolution.
4. Scroll restoration ran before images and dynamic message cards completed
   layout.
5. AI-job failure was conflated with conversation closure in customer display
   state.
6. Customer-facing UI exposed implementation labels.
7. Menu matching did not have robust localized aliases or semantic-like local
   similarity diagnostics.
8. Contact-information phrases could be interpreted as explicit live-human
   requests.

## Architecture decision

PostgreSQL remains the durable authority for conversations, messages, jobs,
control state, and selected assets. WebSocket provides low-latency events but
is no longer the sole continuity mechanism. Authenticated sync endpoints expose
messages and state after a client’s last sequence. Connected clients reconcile
at a slower safety interval; disconnected clients reconcile at a faster
platform-configurable interval.

Realtime authentication now uses one-time tickets issued only after validating
the current customer resume identity or staff session. Tickets are short-lived,
single-use, tenant/platform scoped, and consumed by the `/support` gateway.

## Conversation resume

A customer resume key is stored only as a hash in PostgreSQL. The browser stores
the platform-scoped secret. Successful resume rotates the secret and returns:

- latest active conversation;
- messages after the requested sequence;
- current control/status/version;
- active AI-job state;
- localized customer messages;
- fallback polling interval;
- a fresh support token and realtime ticket capability.

Legacy support-token resume remains a compatibility fallback during rollout.

## Message continuity

Every persisted message has a conversation sequence. Every realtime packet has
an event ID. Clients merge by stable message ID/sequence and ignore duplicates.
A browser that misses a WebSocket event fetches messages after its last known
sequence. Before accepting a new message, the backend validates current
PostgreSQL control state, so a stale browser cannot keep a resolved conversation
stuck in human mode.

## Menu matching

The matcher is deterministic and server-owned. It calculates candidate scores
from exact/contained triggers, aliases, title/keyword token coverage,
character-trigram similarity, category hints, priority, and negative examples.
The backend filters by tenant, platform, publication, approval, deletion, and
locale before ranking.

The selected content ID, score, method, phrase, and asset manifest are persisted
on the AI job. The model receives only approved context and returns plain text.
Media attachment never depends on model-generated IDs.

## Security properties

- Resume keys are hashed at rest and rotated.
- Realtime tickets are single-use and expire.
- Staff tickets revalidate session revocation and current session version.
- Sync endpoints enforce tenant/platform/conversation scope.
- Platform IDs supplied by the browser are not accepted as authority.
- Approved asset manifests remain server controlled.
- Human-handoff state transitions remain backend controlled.
- Historical messages remain immutable.

## Scaling boundary

The database-backed sync and AI queue survive backend restarts. The WebSocket
broadcast bus remains in process for v1.16.2; therefore Render must remain at
one instance. Horizontal scaling requires a shared Redis-compatible broadcast
and presence backplane. PostgreSQL remains the permanent source of truth after
that upgrade.
