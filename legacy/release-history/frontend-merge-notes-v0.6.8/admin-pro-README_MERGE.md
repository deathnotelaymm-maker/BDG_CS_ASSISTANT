# BDG Help Center Business Admin — Connecting the API

This is a **frontend-only** project. All data currently comes from mocks in
`src/lib/mockData.ts` via the API client at `src/lib/api.ts`.

## Switching from mock to live API

1. Open `src/lib/api.ts`.
2. Set `MOCK_MODE = false`.
3. Point `API_BASE_URL` at your backend by either:
   - editing the default fallback string, or
   - defining `VITE_API_BASE_URL` in a `.env` file:
     ```
     VITE_API_BASE_URL=https://bdg-ai-help-api.bdgservice.workers.dev
     ```

## Endpoint contract

The client currently expects these routes on the backend:

| Method | Path                              | Purpose                       |
|--------|-----------------------------------|-------------------------------|
| POST   | `/auth/login`                     | Sign in (returns `{ token }`) |
| GET    | `/admin/dashboard/stats`          | Dashboard counters            |
| GET    | `/admin/ai/diagnostics`           | AI diagnostics panel          |
| POST   | `/admin/ai/test`                  | Run a test AI reply           |
| GET    | `/admin/:resource`                | List records                  |
| POST   | `/admin/:resource`                | Create record                 |
| PUT    | `/admin/:resource/:id`            | Update record                 |
| DELETE | `/admin/:resource/:id`            | Delete record                 |

Where `:resource` is one of:
`site-content`, `help-cards`, `categories`, `guide-images`, `faq`,
`ai-knowledge`, `prompt-history`, `chat-quick-replies`, `chat-logs`,
`audit-logs`, `admin-users`.

## Auth

The login page calls `api.login()` and navigates to `/dashboard` on success.
When you switch to the live backend, extend `api.login` to persist the
returned token (e.g. `localStorage.setItem("bdg_token", token)`) and update
`request()` to attach `Authorization: Bearer <token>` on protected calls.

## What is NOT included

- No backend
- No database
- No Supabase
- No deployment configuration

Add these separately when you're ready to go live.
