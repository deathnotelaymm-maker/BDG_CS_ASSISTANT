# v1.2.1 — Platform Context & No-Fallback Repair

This patch fixes the public tenant experience after v1.2.0:

- Guide categories, guides, FAQ, content, and theme requests carry the active platform context.
- Shared API caching is disabled for platform-aware public responses, so one tenant cannot receive another tenant's topics.
- Non-default platforms no longer inherit BDG logo, hero, welcome, or quick-reply presentation defaults.
- A missing tenant logo is shown as a neutral “Logo not configured” state.
- Existing owner-edited content is preserved; the one-time repair removes only exact legacy copies created by the old provisioning path.
- The repair is recorded in `system_migrations` and is safe to run more than once.
- Brand Studio API/UI fields remain available for platform owners and operators.

Validation completed locally:

- Backend syntax check passed.
- Backend regression, structured response, upload, and knowledge-import tests passed (72/72, 4/4, 4/4, and 5/5).
- Guide, Chat, and Admin production builds passed.

This release does not push to GitHub or deploy to Render/Cloudflare automatically. Review the copied files in GitHub Desktop, commit, and push when ready.
