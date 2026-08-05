# v1.16.2 — Conversation Continuity, Realtime Transport and Media Matching Repair

v1.16.2 repairs the customer experience around asynchronous AI delivery,
human-support resolution, conversation restoration, and approved Menu & Images
matching. PostgreSQL remains the source of truth. WebSocket delivery is retained
for low latency, while authenticated sequence-based HTTP catch-up prevents a
single broken socket from forcing customers or staff to refresh.

Release marker: `1.16.2-conversation-continuity-realtime-media-matching`

## Production conversation architecture

```text
Customer opens Chat
      ↓
Resume latest platform-scoped conversation
      ↓
Rotate the customer resume key
      ↓
Issue a one-time realtime ticket
      ↓
Connect WebSocket
      ↓
Use sequence-based HTTP catch-up as a safety path
      ↓
Restore messages, control state, AI-job state, and latest unread position
```

For each new customer message:

```text
Validate and save the customer message
      ↓
Create durable PostgreSQL AI job
      ↓
Return HTTP 202 and show ephemeral processing state
      ↓
Server selects approved Menu & Images candidates
      ↓
DeepSeek returns plain customer-facing text
      ↓
Server attaches the selected approved media manifest
      ↓
Save the final message
      ↓
Broadcast by WebSocket and expose through sequence catch-up
```

## Realtime continuity

Customer and Staff Console clients receive one-time realtime tickets rather
than depending on a long-lived browser token in the socket protocol. Every
conversation event carries an event ID and every saved message carries an
ordered conversation sequence. Connected clients use WebSocket for immediate
delivery and periodically reconcile with PostgreSQL. Disconnected clients use
a faster authenticated catch-up interval until the socket returns.

Refreshing the page resumes the latest platform-scoped conversation, restores
its current AI or human-control state, renews realtime credentials, and scrolls
to the latest unread message or conversation end. Image loading preserves the
bottom anchor. Customers who scroll upward receive a new-message indicator
instead of being forcibly moved.

## Customer-facing state

The public interface uses neutral brand-facing labels such as `JAVO Support`
and `Online`. It does not expose internal labels such as `AI Assistant`,
`provider failed`, or `realtime offline`. Human assignment and resolution are
shown through customer-friendly localized messages.

A failed AI job no longer closes a conversation. The conversation remains
available, the composer remains enabled, and the customer may retry or send a
new question. When staff resolves with return-to-brand enabled, ownership is
released, control returns to the automated support workflow, and the customer
can continue without refreshing.

## Menu & Images matching

Menu & Images remains the only approved business-content source in the live AI
path. v1.16.2 adds server-owned hybrid matching using:

- exact localized trigger phrases;
- contained trigger phrases;
- localized aliases and alternative spellings;
- title and keyword overlap;
- token coverage;
- character-trigram similarity;
- category and negative-example controls.

The backend selects the content and approved asset manifest before the provider
call. DeepSeek writes only the natural-language response and cannot select an
arbitrary image or content ID. Match method, score, threshold, matched phrase,
selected content, and selected media are stored for diagnostics.

## Contact information and live-human intent

A request for contact information is not automatically treated as a request to
join the live support queue. The backend distinguishes informational requests
such as “Where is Contact Us?” from explicit requests such as “Connect me to a
human agent.” Human handoff remains controlled by the platform setting and
server-side trigger policy.

## Localization

Customer processing, waiting, assignment, provider-failure, resolution,
reconnection, and no-agent messages are managed centrally per platform and per
supported language. The foundation includes English, Burmese, Indonesian,
Chinese, and Hindi defaults.

## Database migration

Apply:

```text
backend-api/migrations/040_v1.16.2_conversation_continuity_realtime_media_matching.sql
```

Migration `040` adds rotating resume continuity, one-time realtime tickets,
read-sequence tracking, localized customer-message settings, fallback sync
configuration, hybrid Menu & Images metadata, and selected-media diagnostics on
AI jobs. It is immutable after production deployment. The next migration must
be `041`.

## Verification commands

```bash
npm --prefix backend-api run check
npm --prefix backend-api run test:regression
npm --prefix backend-api run test:prompt-runtime
npm --prefix backend-api run test:simplified-ai
npm --prefix backend-api run test:support
npm --prefix backend-api run test:v1161
npm --prefix backend-api run test:v1162
npm --prefix backend-api run test:chat-reliability
npm --prefix admin-pro run test:customer-service-route
```

GitHub Actions additionally installs dependencies, starts PostgreSQL, runs the
integration/security/upload suites, typechecks and builds all frontends, waits
for the matching Render release, and publishes Guide, Chat, Staff, and Admin to
Cloudflare Pages.

## Production note

Keep Render at one backend instance for this release. PostgreSQL provides
persistent messages, AI jobs, resume state, and HTTP catch-up, but live
WebSocket broadcasts remain process-local. Add a Redis-compatible broadcast
backplane before horizontal scaling.
