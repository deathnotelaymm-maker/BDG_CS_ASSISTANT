# Domain Structure

Recommended setup:

```text
guide.yourdomain.com  -> Cloudflare Pages project: guide-site
chat.yourdomain.com   -> Cloudflare Pages project: chat-site
admin.yourdomain.com  -> Cloudflare Pages project: admin-site
api.yourdomain.com    -> Render backend custom domain
```

Why subdomains are better:

- easier security separation
- easier independent deployment
- easier Cloudflare setup
- more professional for public guide, chat, and admin

## Cloudflare DNS example

| Type  | Name  | Target |
|---|---|---|
| CNAME | guide | Cloudflare Pages target |
| CNAME | chat  | Cloudflare Pages target |
| CNAME | admin | Cloudflare Pages target |
| CNAME | api   | Render custom domain target |

## Frontend API config

Each static site has `config.js`:

```js
window.APP_CONFIG = {
  API_BASE: 'https://api.yourdomain.com',
  SITE_NAME: 'Your Project Name'
};
```

Change `API_BASE` after backend deployment.
