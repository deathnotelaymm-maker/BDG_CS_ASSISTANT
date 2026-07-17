# v1.3.0 test result

- `npm --prefix backend-api run check` — PASS
- `npm --prefix backend-api run test:regression` — PASS (76/76, 4/4, 4/4, 5/5)
- `npm run build:all` — PASS (Admin, Chat, Guide)

The large Admin bundle warning is informational and does not fail the build.
