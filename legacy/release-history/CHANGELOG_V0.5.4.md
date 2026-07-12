# v0.5.4 — Pages Branch + Guide Runtime Fix

Fixes:
- Guide Pro no longer crashes when Worker `/guide/content` returns the v0.5 CMS shape.
- Guide Pro normalizes Worker guides, FAQs, categories, site content, and popular help into the Lovable UI schema.
- Added public Worker aliases `/popular-help`, `/public/popular-help`, `/navigation`, and `/public/navigation`.
- Deploy scripts deploy Guide Pro and Chat Pro to both `main` and `production` branches so the normal `.pages.dev` URL updates regardless of Cloudflare Pages production branch setting.

Deploy:
1. Copy your working `worker-api/wrangler.toml` into this package.
2. Run `DEPLOY-WORKER-V0.5.4-WINDOWS.ps1`.
3. Run `DEPLOY-PRO-FRONTENDS-WINDOWS.ps1`.
