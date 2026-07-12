# v0.6.8 — Public Guide Backend Binding + Demo Data Removal

This release fixes the public Guide site so it uses only real Worker/backend data created in Admin. It removes Lovable/demo category and featured-guide fallback data from the public Guide frontend.

## Main behavior

- Public Guide categories load from `GET /categories`.
- Public Guide list loads from `GET /guides?language=en|hi`.
- Category and search filters call the backend.
- Guide detail loads from `GET /guides/:slug?language=en|hi`.
- If backend has no records, the page shows an empty state instead of fake/demo content.
- Stock fallback images were removed from guide cards.

## Deploy

Run `DEPLOY-ALL-V0.6.8-WINDOWS.ps1` from the extracted folder.

## Smoke test

1. Open `https://bdg-ai-help-api.bdgservice.workers.dev/health?v=068-final` and confirm `0.6.8-worker`.
2. Open Admin and publish one category plus one guide.
3. Open `https://bdg-guide-pages.pages.dev` and hard refresh.
4. Confirm only Admin-created categories/guides appear.
5. Open the guide detail page and confirm real blocks/images render.
