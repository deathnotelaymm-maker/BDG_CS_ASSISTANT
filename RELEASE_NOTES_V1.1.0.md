# v1.1.0 — Tenant Data Isolation & Platform-Scoped Admin

## Outcome

Each customer platform now has a server-enforced data boundary. A signed-in
platform user can only read or change the content, AI configuration, support
operations, and staff belonging to the selected platform route.

## What is isolated

- Site Content, categories, guides, FAQ, knowledge, AI prompts, AI Prompt &
  Image items, action buttons, quick replies, and theme settings.
- Knowledge-import batches and their draft records.
- Chat sessions, chat logs, unmatched questions, and diagnostics.
- Content versions and Admin audit logs.
- Platform-scoped Admin Users: a platform owner can only manage staff in the
  current child platform.

## How platform access works

Generated access links remain the platform identity:

- `/p/<generated-route-key>/admin`
- `/p/<generated-route-key>/chat`
- `/p/<generated-route-key>/guide`

The Admin application sends the route key with every scoped request. The API
then verifies the active user's membership before it runs the request. The
header alone never grants access.

## New-platform defaults

New platforms receive isolated presentation defaults for Theme, Site Content,
and guide home sections. They **do not inherit** another client’s guides, FAQ
answers, AI knowledge, prompts, or chat history.

## Deployment safety

The database changes are additive and idempotent. Existing BDG data stays on
the protected legacy BDG platform. No domains or Cloudflare configuration are
changed by this release.
