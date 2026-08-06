# Deployment Checklist — v1.16.4

## Before deployment

- [ ] Take a Neon snapshot.
- [ ] Confirm the current production commit and Render release.
- [ ] Confirm v1.16.3 and migration `041` are already deployed.
- [ ] Confirm Admin, Chat, Staff, and Guide origins remain in `ALLOWED_ORIGINS`.
- [ ] Keep Render at exactly one backend instance.

## Deployment order

1. [ ] Push the reviewed v1.16.4 commit.
2. [ ] Let GitHub Actions run backend checks and PostgreSQL integration tests.
3. [ ] Deploy the backend and apply migration `042`.
4. [ ] Verify `/health/live` reports
       `1.16.4-sse-customer-delivery-durable-queue`.
5. [ ] Deploy Guide.
6. [ ] Deploy Chat.
7. [ ] Deploy Staff.
8. [ ] Deploy Admin.

## Customer acceptance

- [ ] A submitted question returns HTTP 202 immediately.
- [ ] The processing indicator appears without becoming a stored message.
- [ ] The final AI answer appears without refresh.
- [ ] Approved Menu & Images media appears with the saved answer.
- [ ] A second question remains blocked while one answer is pending.
- [ ] Temporarily block the SSE request and confirm HTTP catch-up still delivers
      the saved answer.
- [ ] Restore the stream and confirm no duplicate message appears.
- [ ] Refresh and confirm the latest conversation and scroll position restore.

## Human Support acceptance

- [ ] Staff receives customer messages without refresh.
- [ ] Customer receives staff messages without refresh.
- [ ] Staff typing reaches the customer.
- [ ] Human takeover suppresses pending AI output.
- [ ] Resolve returns the customer to brand support immediately.
- [ ] Force logout still disconnects staff WebSocket presence.

## Operational monitoring

- [ ] Watch `sse_stream_closed` warnings.
- [ ] Watch HTTP sync request volume.
- [ ] Confirm heartbeat interval is between 10 and 45 seconds.
- [ ] Confirm there is only one Render backend instance.
- [ ] Do not scale horizontally until a shared realtime backplane is deployed.
