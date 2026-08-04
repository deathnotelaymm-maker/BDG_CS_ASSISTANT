# v1.16.0 Production Deployment Checklist

## 1. Before push

- [ ] Confirm the repository is currently v1.15.5.
- [ ] Take a Neon database snapshot.
- [ ] Record the current Render release and all Cloudflare Pages deployments.
- [ ] Confirm Render is configured for exactly **one** backend instance.
- [ ] Confirm `JWT_SECRET` is at least 32 characters.
- [ ] Add `https://bdg-staff-pages.pages.dev` and any custom staff domain to `ALLOWED_ORIGINS`.
- [ ] Confirm GitHub secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
- [ ] Keep Human Support disabled before migration.

## 2. Commit and push

Commit message:

`v1.16.0 Human Support & Live Chat Foundation`

Push to `main`. The production workflow now validates backend tests, PostgreSQL migration integration, dependency audits, and typechecks/builds for Guide, Chat, Staff, and Admin. It also creates `bdg-staff-pages` through the Cloudflare API when missing.

## 3. Deployment order

1. Render backend deploys the v1.16.0 source.
2. Migration 038 applies.
3. `/health/live` and `/health/ready` must report `1.16.0-human-support-live-chat-foundation`.
4. Guide deploys.
5. Chat deploys.
6. Staff deploys.
7. Admin deploys.
8. Live release-marker verification must pass for all four Pages applications.

Do not deploy the v1.16.0 Chat, Staff, or Admin against an older backend.

## 4. Internal acceptance

- [ ] Keep `human_support_enabled` OFF.
- [ ] Create two test staff accounts in Customer Service → Staff Accounts.
- [ ] Confirm staff cannot sign in through Admin.
- [ ] Confirm temporary password change revokes the original session.
- [ ] Sign in to the Staff console and select Active.
- [ ] Enable Human Support for the test platform only.
- [ ] From Chat, explicitly request a human.
- [ ] Confirm the internal handoff button appears.
- [ ] Confirm the complete AI history appears in the support timeline.
- [ ] Confirm the conversation enters Waiting.
- [ ] Race two agents accepting the same item; only one must succeed.
- [ ] Confirm team viewing is read-only for the non-owner.
- [ ] Send messages in both directions and verify WebSocket delivery.
- [ ] Transfer to the second Active agent; ownership must remain with the first until acceptance.
- [ ] Resolve the conversation and confirm Chat can return to AI.
- [ ] Force logout an assigned agent and confirm the configured assignment policy.
- [ ] Close a staff browser and confirm Offline after the heartbeat timeout.
- [ ] Verify timezone display without modifying stored timestamps.
- [ ] Verify performance and audit records.
- [ ] Attempt cross-platform staff/conversation access and confirm denial.

## 5. Limited production

Enable Human Support for one real platform. Monitor waiting time, duplicate messages, WebSocket disconnects, assignment conflicts, stuck conversations, presence accuracy, provider-failure handoffs, and any AI reply while a human conversation is active.

## 6. Rollback

- Disable `human_support_enabled` first.
- Restore the previous Pages releases and v1.15.5 backend source.
- Restore the database snapshot only when migration rollback is required.
- Do not manually edit migration 038 or delete support tables during an incident.
- Historical support data can remain inert while the feature is disabled.

## 7. Scaling warning

Do not increase the Render backend instance count above one in v1.16.0. Implement a shared realtime backplane before horizontal scaling.
