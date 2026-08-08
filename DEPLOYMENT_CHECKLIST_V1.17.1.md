# Deployment Checklist — v1.17.1

## Before deployment

- [ ] Take a Neon snapshot.
- [ ] Confirm the repository baseline is v1.17.0/v1.17.0-r2.
- [ ] Confirm migration `043` is already applied.
- [ ] Keep official BDG Admin/Chat/Guide/Staff origins in Render `ALLOWED_ORIGINS`.
- [ ] Confirm `ALLOWED_ORIGINS` does **not** contain `*` in production.
- [ ] Do not manually add new client domains to `ALLOWED_ORIGINS` after this release.

## Deploy

1. [ ] Push the reviewed v1.17.1 commit.
2. [ ] Let Render deploy the backend.
3. [ ] Apply migration `044_v1.17.1_verified_domain_mapping_dynamic_cors.sql` through the migration runner.
4. [ ] Confirm `/health` reports `1.17.1-verified-domain-mapping-dynamic-cors`.
5. [ ] Deploy Guide, Chat, Staff, and Admin production builds.
6. [ ] Open Domain Mapping and confirm the **API / CORS** column is visible.

## Acceptance test with a client hostname

Use a custom hostname that is deliberately absent from Render `ALLOWED_ORIGINS`.

- [ ] Add the hostname in Domain Mapping.
- [ ] Before Cloudflare verification, confirm browser API preflight is rejected.
- [ ] Provision the custom hostname and publish the required DNS records.
- [ ] Refresh until Cloudflare hostname and SSL both show active.
- [ ] Confirm Domain Mapping shows **Automatically trusted**.
- [ ] Open the client frontend and confirm API requests succeed without editing Render.
- [ ] Disable **API / CORS** and confirm the client origin is rejected.
- [ ] Re-enable it and confirm access returns after the short cache window.
- [ ] Confirm a route/hostname platform mismatch still returns `PLATFORM_CONTEXT_MISMATCH`.

## Rollback

Rollback application files using the installer backup. Do not modify migration `044` after deployment. If application rollback is necessary, leave the additive columns in place; v1.17.0 code ignores them.
