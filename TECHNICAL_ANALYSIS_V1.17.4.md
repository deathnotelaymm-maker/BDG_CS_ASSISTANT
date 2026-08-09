# Technical Analysis — v1.17.4

## Root causes addressed

### Customer sender alignment
v1.17.3 had the customer-facing Chat alignment reversed relative to the desired support convention. v1.17.4 makes sender type authoritative: customer right, support actors left, system center. Theme settings cannot silently reverse actor ownership.

### Shared CS origin drift
The runtime still contained defaults for `staff.ar-ai666.com` even though the deployed shared CS hostname is `cs.ar-ai666.com`. The default is now corrected in backend CORS/route validation, Staff Pro, and Admin workspace link generation. Domain Mapping presents the application as **CS Workspace** while the legacy `staff` site-kind remains unchanged to avoid database/API migration risk.

### Staff internal identity vs customer-facing identity
A single avatar is insufficient for operational account management. Migration 047 adds `profile_avatar_url` for the internal Staff profile while existing `public_display_name` and `public_avatar_url` remain the customer-facing identity. Admin-controlled policy flags govern Staff self-editing.

### Hardcoded customer menu
The old drawer duplicated Help actions and displayed only the first promotion. v1.17.4 moves menu structure to sanitized backend configuration and renders the entire eligible promotion set as a slideshow.

## Security controls
- CS login remains tenant/platform scoped.
- Shared CS origin requires `/p/<platform-route>`.
- Verified custom CS hostnames still require exact active mapping.
- Staff profile images are validated by content signature and restricted to PNG/JPEG/WEBP, maximum 5 MB.
- Custom Chat Menu links are HTTPS-only.
- Promotion rich HTML is sanitized server-side before public delivery.
- Internal Notes stay excluded from the public customer stream.
- Existing tenant/platform filters remain on Staff, settings, and promotion mutations.

## Realtime correctness
The backend Staff stream is SSE. The Staff client previously consumed it as line-delimited JSON and did not consistently construct the authenticated stream request. v1.17.4 uses Authorization-bearing `fetch` plus SSE frame parsing. Permanent conversation data remains PostgreSQL-backed; SSE delivers permanent events, HTTP sequence catch-up recovers gaps, and WebSocket remains presence/typing only.

## Compatibility
- Migration 046 is not modified.
- Internal `site_kind='staff'`, `LUKE_SHARED_STAFF_ORIGIN`, and other legacy identifiers remain supported.
- v1.17.1 Dynamic CORS, v1.17.2 Luke shared route isolation, v1.17.3 Admin/Staff workspace access, and attachment/internal-note rules remain in place.
