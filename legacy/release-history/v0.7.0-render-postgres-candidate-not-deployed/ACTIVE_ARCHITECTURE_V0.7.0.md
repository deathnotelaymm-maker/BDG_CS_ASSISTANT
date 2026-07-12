# Active Architecture — v0.7.0

## Active production directories

- `backend-api/`
- `guide-pro/`
- `chat-pro/`
- `admin-pro/`

## Historical/rollback directories

- `legacy/apps/worker-api-v0.6.8/`
- `legacy/apps/guide-site-v0.6.8/`
- `legacy/apps/chat-site-v0.6.8/`
- `legacy/apps/admin-site-v0.6.8/`
- `legacy/apps/backend-v0.6.8/`

The historical directories remain intentionally available for rollback. New features and fixes must target only the active production directories unless a rollback compatibility change is explicitly required.
