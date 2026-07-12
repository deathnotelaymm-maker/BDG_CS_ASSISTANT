# Cloudflare Deploy Guide — v0.4.0

## Recommended production structure

```text
faq.yourdomain.com     -> Cloudflare Pages, root: guide-site
chat.yourdomain.com    -> Cloudflare Pages, root: chat-site
admin.yourdomain.com   -> Cloudflare Pages, root: admin-site
api.yourdomain.com     -> FastAPI backend on Render/Railway/Fly, proxied by Cloudflare DNS
PostgreSQL             -> Neon / Supabase / Render PostgreSQL
Images                 -> local uploads for starter; move to Cloudflare R2 for production scale
```

Cloudflare Pages hosts static frontends very well. The current backend is Python/FastAPI, so it cannot run directly on Cloudflare Pages. For easiest production, deploy the backend to Render/Railway/Fly with PostgreSQL, then point `api.yourdomain.com` through Cloudflare DNS.

## Cloudflare Pages setup

Create 3 Pages projects from the same GitHub repo:

### Guide site
- Build command: leave empty
- Build output directory: `guide-site`
- Custom domain: `faq.yourdomain.com`

### Chat site
- Build command: leave empty
- Build output directory: `chat-site`
- Custom domain: `chat.yourdomain.com`

### Admin site
- Build command: leave empty
- Build output directory: `admin-site`
- Custom domain: `admin.yourdomain.com`

Update each `config.js` before deploy:

```js
API_BASE: "https://api.yourdomain.com"
```

## Backend PostgreSQL env

Set these in backend host:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
SECRET_KEY=replace-with-long-random-secret
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=strong-password
ALLOWED_ORIGINS=https://faq.yourdomain.com,https://chat.yourdomain.com,https://admin.yourdomain.com
SUPPORT_LINK=https://t.me/your_support_bot
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
AI_MODE_ENABLED=true
```

## PostgreSQL provider suggestion

For this project, use one of these:

- Neon PostgreSQL: good for serverless-style apps and future pgvector.
- Supabase PostgreSQL: good dashboard and storage options.
- Render PostgreSQL: easiest if backend is also on Render.

## Cloudflare R2 note

This starter still saves uploads in `backend/uploads` for local testing. For production scale, move uploads to Cloudflare R2 and store only URLs in PostgreSQL.
