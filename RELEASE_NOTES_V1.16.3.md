# Release Notes — v1.16.3

## Fixed

- Removed the `/admin/support-platforms` dependency from Menu & Images and
  Global Buttons.
- Added stable active-platform validation before feature data loads.
- Added independent Guide Theme and Chat Theme Admin contracts.
- Prevented a second customer question while an automated response is pending.
- Added database enforcement for one active AI job per conversation.
- Added latest-ten-message restoration and previous-history pagination.
- Preserved scroll position when older messages are prepended.
- Removed the public Chat language dropdown.
- Replaced localized button labels with one global label and subtitle.
- Removed hard-coded Burmese example placeholders from the changed Admin forms.
- Added v1.16.3 CI and production regression gates.

## Compatibility

- Builds on v1.16.2-r2.
- Preserves the v1.16.1 durable plain-text AI worker.
- Preserves v1.16.2 realtime tickets, catch-up, resume, and media matching.
- Preserves Human Support, Staff Console, assignment, transfer, and resolution.
- Keeps legacy theme and localized-button data for rollback.

## Database

Migration `041_v1.16.3_admin_chat_theme_and_queue_guard.sql` is additive and
non-destructive. Do not edit it after release.
