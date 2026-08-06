# Deployment Checklist — v1.17.0

## Before deployment

- [ ] Take a Neon database snapshot.
- [ ] Record the current production commit, Render release, and Cloudflare Pages
      releases.
- [ ] Confirm v1.16.4 and migration `042` are already deployed.
- [ ] Confirm the R2 `GUIDE_IMAGES` binding exists for support attachments and
      promotional images.
- [ ] Confirm Admin, Chat, Guide, Staff, and every custom Staff origin are listed
      in `ALLOWED_ORIGINS`.
- [ ] Keep Render at exactly one backend instance.
- [ ] Review the privacy notice and retention policy for IP/device context.
- [ ] Keep the initial attachment allowlist limited to PNG, JPEG, WEBP, PDF, and
      plain text.
- [ ] Confirm that no workflow treats `scan_status=pending` as antivirus-clean.

## Deployment order

1. [ ] Push the reviewed v1.17.0 commit.
2. [ ] Let GitHub Actions complete backend tests, frontend typechecks/builds,
       database integration, upload/security suites, and audits.
3. [ ] Deploy the backend and apply migration `043`.
4. [ ] Verify `/health/live` reports
       `1.17.0-professional-support-workspace-chat-media`.
5. [ ] Deploy Guide.
6. [ ] Deploy Chat.
7. [ ] Deploy Staff.
8. [ ] Deploy Admin.
9. [ ] Verify all production Pages projects use the same API release.

## Domain Mapping acceptance

- [ ] Staff Console appears beside Admin, Chat, and Guide.
- [ ] Open and Copy URL actions use the generated Staff origin.
- [ ] A Staff custom domain has no `/p/<platform-route>` suffix.
- [ ] DNS, SSL, CORS, and backend release verification pass.

## Queue and ownership acceptance

- [ ] An Active staff member sees a waiting conversation.
- [ ] Staff can accept it without Admin assignment.
- [ ] Two simultaneous acceptance attempts cannot both succeed.
- [ ] Team viewers remain read-only.
- [ ] Admin can join, assign, force-transfer, resolve, and inspect the same
      conversation history.

## Attachment acceptance

- [ ] Customer upload controls are absent in automated support mode.
- [ ] Customer upload controls appear only after a staff member owns the active
      human conversation.
- [ ] Controls disappear immediately after resolution returns to support.
- [ ] Staff and Admin can send permitted images/files.
- [ ] Oversized, mismatched, forged, HTML, executable, and script files are
      rejected.
- [ ] Attachment rows contain tenant/platform/conversation scope and SHA-256.
- [ ] Cross-platform attachment access is denied.
- [ ] Customer and staff receive the saved attachment message without refresh.

## Quick-reply acceptance

- [ ] Admin can create, update, disable, and archive platform replies.
- [ ] Permitted staff can use platform replies.
- [ ] Staff can create and manage only their personal replies.
- [ ] Another staff member cannot edit someone else's personal reply.
- [ ] Quick-reply insertion sends a normal immutable staff message.

## Customer-context acceptance

- [ ] Current page, browser, OS, and device type appear for authorized users.
- [ ] IP data is masked or hidden for roles without permission.
- [ ] Cross-platform context access is denied.
- [ ] Approximate region is not presented as exact location.

## Promotional carousel acceptance

- [ ] Admin can create and order promotional cards.
- [ ] Images render at the configured Chat placement.
- [ ] HTTPS links open safely.
- [ ] Autoplay, interval, arrows, indicators, height, and radius settings work.
- [ ] Promotions hide during active human support when configured.
- [ ] Promotional cards do not become support messages or affect reply metrics.

## Operational monitoring

- [ ] Watch assignment-conflict and permission-denied rates.
- [ ] Watch attachment validation/storage failures and R2 usage.
- [ ] Watch SSE disconnects and HTTP catch-up volume.
- [ ] Review pending attachment scan records; do not expand risky file types
      without a malware scanner.
- [ ] Keep one Render instance until shared pub/sub is available.
