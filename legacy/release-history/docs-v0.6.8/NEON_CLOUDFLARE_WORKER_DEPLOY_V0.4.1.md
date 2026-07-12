# v0.4.1 — Neon PostgreSQL + Cloudflare Hyperdrive + Worker Deploy Guide

This release keeps the local FastAPI backend, but adds a production `worker-api/` for Cloudflare Workers.

## Production architecture

```text
Cloudflare Pages
├── guide-site  → public FAQ / guide website
├── chat-site   → public AI chat
└── admin-site  → admin control panel

Cloudflare Worker
└── worker-api  → API routes, DeepSeek, memory, image uploads

Cloudflare Hyperdrive
└── connection pool to Neon PostgreSQL

Cloudflare R2
└── guide images, receipt images, customer screenshots

Neon PostgreSQL
└── content, prompt sections, chat memory, chat logs, settings
```

## 1. Create Neon database

Create a Neon project and database, for example:

```text
Database name: bdg_ai_help
Role/user: hyperdrive_user
```

Copy your direct PostgreSQL connection string in this style:

```text
postgres://USER:PASSWORD@HOST:5432/bdg_ai_help?sslmode=require
```

## 2. Run database schema

Open Neon SQL Editor and run:

```text
worker-api/schema/schema.sql
```

This creates all tables and starter seed data.

## 3. Create R2 bucket

```powershell
npx wrangler r2 bucket create bdg-ai-guide-images
```

## 4. Create Hyperdrive

Replace the connection string with your Neon direct connection string:

```powershell
npx wrangler hyperdrive create bdg-ai-hyperdrive --connection-string="postgres://USER:PASSWORD@HOST:5432/bdg_ai_help?sslmode=require"
```

Copy the returned Hyperdrive ID.

## 5. Configure Worker

```powershell
cd worker-api
copy wrangler.toml.example wrangler.toml
notepad wrangler.toml
```

Paste your Hyperdrive ID here:

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "PASTE_HYPERDRIVE_ID_HERE"
```

## 6. Add secrets

```powershell
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_PASSWORD
```

Recommended:

```text
JWT_SECRET: long random text, at least 32 characters
ADMIN_PASSWORD: change from default before public use
```

## 7. Deploy Worker

```powershell
npm install
npx wrangler deploy
```

Expected result:

```text
https://bdg-ai-help-api.YOURNAME.workers.dev
```

Test:

```text
https://bdg-ai-help-api.YOURNAME.workers.dev/health
```

## 8. Point frontends to Worker API

Edit these files:

```text
guide-site/config.js
chat-site/config.js
admin-site/config.js
```

Set:

```js
API_BASE: 'https://bdg-ai-help-api.YOURNAME.workers.dev'
```

When you have your real domain later, change it to:

```js
API_BASE: 'https://api.yourdomain.com'
```

## 9. Deploy frontends to Cloudflare Pages

Create three Pages projects:

```text
bdg-guide-site  → output folder: guide-site
bdg-chat-site   → output folder: chat-site
bdg-admin-site  → output folder: admin-site
```

No build is required for these plain static folders.

## 10. First production test

1. Open admin-site Pages URL.
2. Login with:
   - Email from `ADMIN_EMAIL` in `wrangler.toml`.
   - Password from `ADMIN_PASSWORD` secret.
3. Upload a guide image.
4. Add keywords.
5. Open chat-site and ask a matching question.
6. Confirm the chat reply shows the matched guide image.
