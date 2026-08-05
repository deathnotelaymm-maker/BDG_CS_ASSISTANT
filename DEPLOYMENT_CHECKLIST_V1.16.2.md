# Deployment Checklist — v1.16.2

## Before deployment

- [ ] Confirm the repository contains v1.16.1 backend and migration `039`.
- [ ] Take a Neon/PostgreSQL snapshot.
- [ ] Record the current Render release ID.
- [ ] Record current Guide, Chat, Staff, and Admin Cloudflare Pages releases.
- [ ] Confirm Render uses Node.js 22 and exactly one backend instance.
- [ ] Confirm `ALLOWED_ORIGINS` contains all production Admin, Chat, Guide, and
      Staff origins.
- [ ] Confirm the DeepSeek credential remains stored only in Render secrets.
- [ ] Do not edit migrations `037`, `038`, or `039`.

## Deployment order

1. Push the reviewed v1.16.2 commit.
2. Let Render build the backend.
3. Apply migration `040` through the normal immutable migration runner.
4. Confirm `/health` reports release marker
   `1.16.2-conversation-continuity-realtime-media-matching`.
5. Confirm the database migration ledger contains migration `040` and checksum.
6. Publish Guide.
7. Publish Chat.
8. Publish Staff.
9. Publish Admin.
10. Confirm all Pages releases use the matching API release.

Do not publish v1.16.2 frontends against an older backend.

## Admin acceptance

- [ ] Open Menu & Images and confirm Category, Match Threshold, and localized
      aliases are available.
- [ ] Publish and approve one real menu item with a valid image.
- [ ] Run Hybrid Match Tester in Burmese, Indonesian, and English.
- [ ] Confirm selected item, match method, score, threshold, and image count.
- [ ] Open Customer Service settings and review localized customer messages.
- [ ] Confirm fallback synchronization interval is configured (recommended
      2500 ms initially).
- [ ] Confirm Human Handoff setting matches the intended platform behavior.

## Customer acceptance

- [ ] Send a message and confirm the temporary processing indicator appears.
- [ ] Confirm the final answer appears without refreshing.
- [ ] Confirm a matching approved menu image appears with the answer.
- [ ] Disable WebSocket in DevTools and confirm fallback catch-up still delivers
      the final answer automatically.
- [ ] Refresh and confirm the existing conversation resumes.
- [ ] Confirm refresh scrolls to the latest unread or latest message.
- [ ] Confirm image loading does not move the customer back to the top.
- [ ] Confirm the header shows only the platform brand and customer-friendly
      state, not `AI Assistant` or technical socket/provider labels.
- [ ] Simulate provider failure and confirm the conversation remains open.
- [ ] Ask for contact information and confirm it does not automatically create
      a live support queue request.

## Human Support acceptance

- [ ] Customer enters the waiting queue without refresh.
- [ ] Active staff sees the new queue item without refresh.
- [ ] Staff reply appears to the customer without refresh.
- [ ] Customer reply appears in Staff without refresh.
- [ ] Staff resolves with return-to-brand enabled.
- [ ] Customer status and composer update without refresh.
- [ ] The next customer message enters the AI worker successfully.
- [ ] A missed resolution event is repaired by the next sync/send.
- [ ] Queue cancellation works before assignment.
- [ ] Staff force logout and revoked sessions cannot obtain a realtime ticket.

## Monitoring after release

Monitor for at least 24–48 hours:

- WebSocket connection/reconnection rate;
- fallback sync volume and latency;
- resume failures and rotated-key failures;
- duplicate event/message suppression;
- conversations stuck in human control after resolution;
- failed AI jobs that incorrectly affect conversation status;
- menu no-match reasons and match-score distribution;
- image attachment failures;
- cross-platform authorization failures;
- Render restarts and stale worker recovery.

## Rollback

- Disable new frontend releases first and restore the prior Pages deployments.
- Restore the prior Render release if backend behavior must be reverted.
- Use the installer-created file backup for local source rollback.
- Do not delete or rewrite migration `040` after it has been applied.
- Database columns/tables introduced by migration `040` are additive and can
  remain unused during a code rollback.
