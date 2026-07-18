# v1.7.0 — Strict Tenant Routing + One-Time Quick Replies

This release hardens the public tenant boundary before adding the next AI
knowledge surface.

## What changed

- Public `/p/<route>` requests resolve only the immutable `public_route_key`.
  Legacy support aliases can no longer select a tenant's public content.
- Missing or invalid tenant branding is neutral (`Platform` / `Platform Help
  Center`) instead of exposing a generated route token or BDG branding.
- Quick replies are loaded only from the active tenant response. Built-in
  replies are never shown while a tenant response is unavailable.
- Quick replies render once above the chat composer and disappear after the
  customer uses them. The persisted lifecycle defaults to `one_time`, with a
  `persistent` mode available for a future explicit use case.
- Existing content remains intact; the migration is additive and idempotent.

## Verification

- Backend syntax check passed.
- Full backend regression suite: 78/78 passed.
- Structured response and upload checks: 4/4 each passed.
- v1.7.0 focused checks: 7/7 passed.
- Admin, Chat, and Guide production builds completed successfully.

The installer only copies this release into the standalone
`BDG_CS_ASSISTANT` repository. It does not push to GitHub or deploy to Render
or Cloudflare.
