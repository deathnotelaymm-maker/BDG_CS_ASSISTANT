# Active Architecture — v0.7.0a

```text
Cloudflare Pages
├── Guide Pro
├── Chat Pro
└── Admin Pro
         │
         ▼
Render paid Node.js Web Service — Singapore
         │
         ▼
Existing Neon PostgreSQL
├── pooled URL for runtime traffic
└── direct URL for pre-deploy migrations/backups

Cloudflare R2 — guide/chat images
DeepSeek — AI replies
```

The v0.7.0 Render PostgreSQL candidate was not deployed and is retained only in `legacy/release-history`. v0.7.0a does not create a Render database and does not copy production data.
