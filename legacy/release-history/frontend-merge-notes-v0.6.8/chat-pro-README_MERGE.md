# BDG Chat Pro — Merge & Deploy Guide

Pure static Vite + React + TypeScript SPA. Text-only mobile chat UI for BDG
customer support. No backend, no SSR, no Cloudflare Worker, no Supabase, no
voice, no microphone, no media/attachment upload.

## Build

```
npm install
npm run build
```

Output:

```
dist/
  index.html
  assets/...
```

`dist/index.html` is the entry file. `dist/assets/` contains hashed JS/CSS.
No server runtime is required.

## Local dev

```
npm run dev       # http://localhost:8080
npm run preview   # serve the built dist/ locally
```

## Deploy to Cloudflare Pages (static)

Cloudflare Pages → **Create a project** → connect the repo, then set:

- **Framework preset:** None (or "Vite")
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** 20+ (env var `NODE_VERSION=20`)

That's it. No Workers, no Functions, no `wrangler.toml`, no `_worker.js`.
Cloudflare Pages serves the static `dist/` folder directly.

SPA fallback is handled by `public/_redirects` (`/* /index.html 200`), which
Cloudflare Pages ships as-is so deep links / refresh work.

Any other static host works the same way (Netlify, Vercel static, S3+CloudFront,
GitHub Pages, nginx). Point it at `dist/` and enable SPA fallback to
`index.html`.

## API base

Default: `https://bdg-ai-help-api.bdgservice.workers.dev`

Override at build time via env:

```
VITE_BDG_API_BASE=https://your-worker.example.workers.dev
```

Set it in `.env` at the project root, in your Cloudflare Pages project's
environment variables, or in your CI. Read in `src/lib/api.ts` via
`import.meta.env.VITE_BDG_API_BASE`.

## Chat API client

Location: `src/lib/api.ts`

Exports:
- `sendChatMessage(message)` — POSTs `{ message, session_id, image_urls: [] }` to `/chat`.
- `getSessionId()` — persisted guest session id.
- Types: `ChatResponse`, `MatchedGuide`, `ChatSource`.

Text-only: `image_urls` is always `[]`. All network calls go through this
module — nothing else in the app calls `fetch` directly.

## Session ID

- Generated on first use and stored in `localStorage` under `bdg_chat_session_id`.
- Reused for every subsequent request. No login required.
- Reset: `localStorage.removeItem("bdg_chat_session_id")`.

## Admin-managed texts (only mock data)

All user-facing strings live in `src/lib/chat-config.ts` (title, welcome,
quick questions, support link, fallback, submit-ticket label, placeholders).
Replace the exported `chatConfig` object with an API fetch result of the
same shape when a real admin API is available. The initial welcome bubble
in `src/App.tsx` reads `chatConfig.welcomeText` — delete that seed entry
from the `useState` initializer if you don't want a pre-populated message.

No other mock/fixture data exists.

## Merging into an existing SPA

Copy these files into the target project:

- `src/App.tsx` — chat page component (default export). Rename/relocate as needed.
- `src/lib/api.ts` — API client + session id.
- `src/lib/chat-config.ts` — admin-managed text.
- Chat-related tokens/utilities from `src/styles.css` (BDG gold on dark surface,
  `.chat-scroll`, `.msg-in`, `.typing-dot`, bubble colors).

If the target project already has its own root/router, mount `<App />`
inside a route instead of at the app root.

## Behavior contract

- Send disabled while AI is replying. A second submit shows an inline
  "Please wait for the current reply." note (no popups).
- Quick-question chips are disabled while processing.
- On API failure: assistant fallback bubble with **Try Again** + **Contact Support**.
- Auto-scrolls to latest message; input refocuses after reply.
- Matched guide cards render inside the AI reply when the API returns
  `matched_guides`.

## What this project is NOT

- Not TanStack Start / not SSR.
- Not a Cloudflare Worker. `dist/` is static assets only.
- No Supabase, no database, no server-side code.
- No voice / microphone / media / attachment upload. Text only.
