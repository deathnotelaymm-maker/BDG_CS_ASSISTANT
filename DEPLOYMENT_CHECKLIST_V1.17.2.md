# Deployment Checklist — v1.17.2

## Before deployment

- Take a Neon/PostgreSQL snapshot.
- Confirm v1.17.1-r2 is the current baseline.
- Confirm migration 044 is already present/applied in production.
- Confirm the four Pages projects are healthy.
- In Cloudflare Pages, attach these custom domains once to the correct projects:
  - `admin.ar-ai666.com` -> Admin Pages project
  - `staff.ar-ai666.com` -> Staff Pages project
  - `guide.ar-ai666.com` -> Guide Pages project
  - `chat.ar-ai666.com` -> Chat Pages project
- Wait until Cloudflare shows the four hostnames and certificates as Active.
- Keep the existing Pages.dev origins in Render `ALLOWED_ORIGINS`. v1.17.2 trusts the configured Luke shared origins directly; do not add per-client `/p/...` URLs to CORS.
- Never configure `ALLOWED_ORIGINS=*` in production.

## Deploy

1. Push the v1.17.2 commit.
2. Allow the complete GitHub Actions workflow to pass.
3. Deploy the backend.
4. Apply migration `045_v1.17.2_luke_shared_hosting_platform_route.sql` through the normal migration runner.
5. Verify backend `/health` reports `1.17.2-luke-shared-hosting-platform-route`.
6. Deploy Admin.
7. Deploy Staff.
8. Deploy Guide.
9. Deploy Chat.

## Acceptance tests

- Create or select a platform in Luke Shared Hosting mode.
- Confirm Admin, Staff, Guide, and Chat links all contain the same immutable `/p/<platform-route>`.
- Open all four links successfully.
- Confirm the Admin route works without `/admin` after the platform route.
- Confirm a Staff account for Platform A cannot log in through Platform B's route.
- Confirm Chat and Guide load only Platform A content from Platform A's route.
- Confirm a bogus route receives a neutral not-found/context error and never falls back to another platform.
- Confirm changing the platform display name does not change `public_route_key`.
- Confirm a verified custom domain still resolves without a `/p/...` suffix.
- Confirm an unverified/pending custom domain remains rejected by Dynamic CORS.
- Confirm Platform A cannot read or write Platform B records through route/header substitution.

## Rollback

The installer creates a changed-file rollback backup. Database rollback should be handled deliberately from the pre-deployment snapshot if migration 045 must be reverted; do not edit an already-applied migration file.

## Next migration

`046`
