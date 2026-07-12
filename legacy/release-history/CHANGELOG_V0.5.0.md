# v0.5.0 — Business Admin CMS + Professional Help Center

## Major changes
- Removed AI Chat entry from the guide-site bottom navigation.
- Converted guide-site into a pure official help center: FAQ, guides, topics, popular help, and support only.
- Added database-backed Site Content Manager so admin can edit guide homepage text without code changes.
- Added Popular Help card management.
- Added Bottom Navigation management.
- Added Homepage Section visibility management.
- Added Chat Quick Reply management for the standalone chat site.
- Upgraded AI Prompt Manager with visible prompt list, edit controls, and prompt version history.
- Added prompt restore endpoint.
- Added admin audit logs.
- Added /guide/content API for business CMS-driven frontend rendering.
- Worker self-creates v0.5 CMS tables on first request.
- Kept Cloudflare Worker + Neon Hyperdrive + R2 + DeepSeek architecture.

## Important URL rule
Guide site is now guide/help only. AI chat remains separate:
- guide: Cloudflare Pages guide project
- chat: Cloudflare Pages chat project
- admin: Cloudflare Pages admin project
- api: Cloudflare Worker `bdg-ai-help-api`
