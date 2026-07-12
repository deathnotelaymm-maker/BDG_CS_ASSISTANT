# v0.5.2 — Chat Pro + Guide Pro CMS Merge

This release imports the two Lovable UI projects:

- `chat-pro/` — professional text-only BDG AI support chat.
- `guide-pro/` — professional BDG Help Center + Guide CMS editor UI.

## Recommended deploy order

1. Deploy the Worker update if you want the v0.5.2 API category-slug guide save fix:

```powershell
.\DEPLOY-WORKER-V0.5.2-WINDOWS.ps1
curl.exe -s https://bdg-ai-help-api.bdgservice.workers.dev/health
```

2. Deploy Guide Pro:

```powershell
.\DEPLOY-GUIDE-PRO-WINDOWS.ps1
```

3. Deploy Chat Pro:

```powershell
.\DEPLOY-CHAT-PRO-WINDOWS.ps1
```

Or deploy both:

```powershell
.\DEPLOY-PRO-FRONTENDS-WINDOWS.ps1
```

## Expected URLs

- Guide Pro: `https://bdg-guide-pages.pages.dev`
- Chat Pro: `https://main.bdg-chat-pages.pages.dev` or `https://bdg-chat-pages.pages.dev`
- API Worker: `https://bdg-ai-help-api.bdgservice.workers.dev`

## Notes

- Do not deploy these folders with `wrangler deploy` as Workers.
- These are Cloudflare Pages React apps. Use `wrangler pages deploy dist` after build.
- The old `guide-site/` and `chat-site/` are kept as fallback.
