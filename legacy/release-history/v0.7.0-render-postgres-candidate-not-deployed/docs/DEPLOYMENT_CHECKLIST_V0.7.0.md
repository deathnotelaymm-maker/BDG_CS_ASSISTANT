# Production Deployment Checklist — v0.7.0

## Before deployment

- [ ] Full v0.6.8 source and Neon database backup retained
- [ ] Private GitHub repository created
- [ ] GitHub Actions workflow passes
- [ ] Render payment method and paid service/database plans confirmed
- [ ] Production owner email and strong password prepared
- [ ] DeepSeek key prepared
- [ ] R2 S3 API token restricted to the intended bucket
- [ ] Exact Guide, Chat, and Admin origins listed

## Render and database

- [ ] `render.yaml` Blueprint created
- [ ] All prompted Render secrets entered
- [ ] Render API and PostgreSQL are in Singapore
- [ ] First Render deployment reaches `/health/ready`
- [ ] Render external DB access temporarily restricted to the migration workstation IP
- [ ] Neon source dump created and validated
- [ ] Render pre-import rollback dump created
- [ ] Neon dump restored to Render
- [ ] External DB access disabled again
- [ ] Render redeployed so the migration marker is applied
- [ ] `/health/ready` and `/health/dependencies` return `0.7.0-render`

## Cloudflare Pages

- [ ] Guide Pro deployed with Render API URL
- [ ] Chat Pro deployed with Render API URL
- [ ] Admin Pro deployed with Render API URL
- [ ] No production build contains the old Worker API URL

## Functional acceptance

- [ ] Owner login works
- [ ] Admin role restrictions work
- [ ] Guide categories load
- [ ] English and Hindi guide lists load
- [ ] Guide detail loads
- [ ] Guide create/edit/delete works
- [ ] Guide and chat image uploads work
- [ ] Public FAQ and chat content load
- [ ] Smart Match returns relevant guides
- [ ] DeepSeek response works and times out gracefully
- [ ] Backend outage shows retryable service error, not false empty content
- [ ] Request IDs appear in Render logs

## After cutover

- [ ] Observe production before disabling the v0.6.8 Worker
- [ ] Retain Neon and all dumps during the agreed rollback window
- [ ] Configure API custom domain and DNS
- [ ] Confirm public cache rules never cover admin, auth, chat POST, or uploads
