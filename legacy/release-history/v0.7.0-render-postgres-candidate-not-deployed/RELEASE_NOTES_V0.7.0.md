# Release Notes — v0.7.0

## Release name

Render Business Backend Migration

## Summary

This release replaces the production Cloudflare Worker/Hyperdrive request path with an always-on Render Node.js API and same-region Render PostgreSQL. Cloudflare Pages and R2 remain in place. The full v0.6.8 Worker source is preserved under `legacy/apps/` for rollback.

## Main result

A temporary API or database failure no longer appears to customers as “nothing has been published.” Guide Pro now reports a real service error with retry behavior, while Render readiness checks prevent unhealthy API versions from receiving production traffic.

## Database migration status

- New migration marker: `v0.7.0_render_business_backend`
- Migration method: idempotent Render `preDeployCommand`
- Existing v0.6.8 data: preserved through `pg_dump`/`pg_restore`
- Destructive source changes: none
- Automatic source deletion: none
- Rollback dump: generated before target restore

## Intentionally unchanged

- Guide, Chat, and Admin visual design
- Existing API route contracts
- Guide block/CMS data model
- Smart Match and DeepSeek response logic
- Cloudflare Pages project names
- Cloudflare R2 bucket name
- Existing v0.6.8 Worker deployment during the migration observation window

## Public Guide reliability

Home categories, featured guides, FAQ, guide lists, and guide details now distinguish real empty content from API failure. Customers receive a professional retry panel during a backend interruption; a true missing guide still returns the normal “Guide not found” page.
