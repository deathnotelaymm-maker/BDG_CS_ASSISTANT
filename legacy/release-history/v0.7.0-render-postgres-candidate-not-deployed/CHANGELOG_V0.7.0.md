# Changelog v0.7.0

## Backend

- Added `backend-api/` as the active Render Node.js service.
- Preserved API compatibility with the v0.6.8 Guide, Chat, and Admin routes.
- Replaced one-connection-per-query behavior with a bounded PostgreSQL pool.
- Removed schema/bootstrap execution from customer requests.
- Added a Render pre-deploy migration command protected by a PostgreSQL advisory lock.
- Added `/health/live`, `/health/ready`, and `/health/dependencies`.
- Added structured JSON request/error logs and request IDs.
- Added graceful SIGTERM/SIGINT shutdown.
- Added request-size limits and endpoint rate limits for login and chat.
- Added public cache headers and private no-store headers.
- Added Cloudflare R2 access through `@aws-sdk/client-s3`.

## Security

- Removed hardcoded owner-password and JWT-secret fallbacks from the active backend.
- Removed owner recovery-token issuance when the database is unavailable.
- Restored strict database-backed token and `session_version` validation.
- Added timing-safe token signature comparison.
- Added scrypt hashing for new and changed passwords while preserving legacy-hash login compatibility.
- Required a 12-character password when creating an admin.
- Added startup/pre-deploy secret validation.
- Added exact-origin CORS validation in the Render HTTP layer.

## Frontends

- Removed production fallback to the old Worker URL.
- Added explicit Render API build variables.
- Changed public Guide API failures to real error/retry states.
- Prevented error responses from displaying the empty-content message.
- Added request timeouts and Query retry/stale settings.
- Added reproducible npm lockfiles for all three active frontends.

## Deployment

- Added `render.yaml` for the Render web service and PostgreSQL database.
- Added Neon-to-Render backup/restore scripts.
- Added Cloudflare Pages deployment and production verification scripts.
- Added safe patch application with automatic backup.
- Added GitHub Actions CI required by Render `checksPass` deployment mode.
- Added an optional isolated staging Blueprint example.
- Added owner-only enforcement for changing another administrator's password.
- Password changes and owner recovery now increment `session_version` to revoke existing sessions.
- Made the migration advisory lock cover every schema query on the same PostgreSQL session.
- Added explicit retryable service-error states to the Guide home page, FAQ page, guide list, and guide detail pages so outages never appear as unpublished content.
- Preserved real 404 guide handling separately from backend connectivity errors.
