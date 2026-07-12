# BDG Guide Pro + Guide CMS — Static SPA

Pure static Vite + React + TypeScript SPA. No SSR, no server code, no
Cloudflare Worker deployment from this repo. Ready for Cloudflare Pages
(or any static host).

## Scripts

```
npm install
npm run dev       # local dev on :8080
npm run build     # -> dist/index.html + dist/assets/
npm run preview   # serve the built dist/
```

`npm run build` produces:

- `dist/index.html`
- `dist/assets/*.js`, `*.css`
- `dist/_redirects` (SPA fallback for Cloudflare Pages)
- `dist/favicon.ico`

## Project structure

```
index.html              # SPA entry
src/main.tsx            # bootstraps <RouterProvider>
src/router.tsx          # TanStack Router (client-only)
src/routes/             # file-based routes
  __root.tsx            # root layout + QueryClientProvider
  _public.*.tsx         # public Help Center (Home / Guides / FAQ / Support)
  admin.*.tsx           # Guide CMS admin (login, guides, categories, ...)
src/components/         # shared UI + admin + editor components
src/lib/api.ts          # ALL real API calls go through here
src/mock/data.ts        # isolated mock data used until backend is wired
public/_redirects       # `/*  /index.html  200` for SPA routing
```

## API client

`src/lib/api.ts` is the single source of truth for HTTP calls.

- Base URL: `https://bdg-ai-help-api.bdgservice.workers.dev`
  (override with `VITE_API_BASE` at build time).
- Mock mode: `VITE_USE_MOCK=true` forces mocks from `src/mock/data.ts`.
  When mock mode is off, failed requests transparently fall back to mocks
  in dev.
- Admin auth: bearer token stored in `localStorage["bdg_admin_token"]`,
  automatically attached to admin endpoints; a 401 clears the token and
  redirects to `/admin/login`.

## Deploying to Cloudflare Pages (static)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - Framework preset: **None** (or Vite)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: 20+
4. Environment variables (optional):
   - `VITE_API_BASE` — override the API base URL
   - `VITE_USE_MOCK` — set to `true` to ship a mock-only build
5. Deploy. The included `public/_redirects` (`/*  /index.html  200`) makes
   client-side routes like `/guides/foo` and `/admin/guides` resolve on
   hard-refresh and deep links.

No Workers, no Functions, no Pages Functions are required or created by
this project.

## Merging into the existing Cloudflare Worker API project

The Worker API repo (`bdg-ai-help-api.bdgservice.workers.dev`) stays
separate. This SPA only *calls* it.

- Keep the Worker as your backend and CORS-allow the Pages origin.
- Copy `src/`, `public/`, `index.html`, `vite.config.ts`, `tsconfig.json`,
  `package.json`, and `components.json` into the frontend folder of the
  target monorepo (or keep this as its own repo).
- Point `VITE_API_BASE` at the deployed Worker URL and rebuild.
