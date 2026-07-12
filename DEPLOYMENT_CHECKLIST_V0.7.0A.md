# Production Deployment Checklist — v0.7.0a

## Before deployment
- [ ] Existing Neon project/branch/database confirmed
- [ ] Neon production backup created and validated
- [ ] `DATABASE_URL` is pooled and contains `-pooler`
- [ ] `MIGRATION_DATABASE_URL` is direct and targets the same database
- [ ] Neon and Render regions reviewed for latency
- [ ] Separate Neon branch/database selected for staging
- [ ] Required Render/R2/DeepSeek secrets prepared
- [ ] GitHub Actions checks pass

## Render
- [ ] Blueprint creates a web service only—no Render PostgreSQL
- [ ] Pre-deploy migration succeeds
- [ ] `/health/live` returns `0.7.0a-render-neon`
- [ ] `/health/ready` reports `database_provider: neon` and `connection_mode: pooled-runtime`
- [ ] `/health/dependencies` reports Neon, R2, and DeepSeek status

## Cloudflare Pages
- [ ] Guide Pro deployed with Render API URL
- [ ] Chat Pro deployed with Render API URL
- [ ] Admin Pro deployed with Render API URL

## Functional regression
- [ ] Owner/Admin authentication and permissions
- [ ] Category and guide create/edit/delete
- [ ] English/Hindi content and images
- [ ] FAQ and Quick Replies
- [ ] Smart Match and DeepSeek chat
- [ ] R2 uploads and public display
- [ ] Real API failure shows retry UI, not false empty content
- [ ] Old Worker retained for rollback observation window
