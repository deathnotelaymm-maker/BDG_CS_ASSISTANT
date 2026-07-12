# Legacy v0.6.8 Material — Do Not Deploy

These files are retained only for rollback reference and release history. They contain the previous Cloudflare Worker/Hyperdrive/Neon architecture and historical development defaults that do not meet the v0.7.0 production security baseline.

Active production development and deployment must use only:

- `backend-api/`
- `guide-pro/`
- `chat-pro/`
- `admin-pro/`
- root `render.yaml`

For emergency traffic rollback, use the separately retained original v0.6.8 release archive and follow `ROLLBACK_V0.7.0.md`. Do not expose or deploy files directly from this `legacy/` directory.
