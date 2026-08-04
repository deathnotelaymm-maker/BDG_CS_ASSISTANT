# v1.16.0-r3 — Admin Customer Service Route Crash Hotfix

This revision supersedes the v1.16.0-r2 repair package for the Admin Customer Service page.

## Fixed

The route `/admin/customer-service` crashed during its first render because the
Support Conversation drawer evaluated `detail.conversation.status` while
`detail` was still `null`.

The fix:

- introduces a typed nullable `SupportConversationDetail` state;
- guards all detail-dependent Drawer children behind `detail ? ... : null`;
- rejects incomplete conversation payloads with a visible Admin message;
- normalizes missing `messages` to an empty array;
- adds a source regression test and wires it into CI and production release checks.

## Unchanged

- Application version: `1.16.0`
- API release marker: `1.16.0-human-support-live-chat-foundation`
- Database migration: `038`
- Staff authentication, support queue, transfer, presence, and WebSocket behavior

No database migration is required for this hotfix.
