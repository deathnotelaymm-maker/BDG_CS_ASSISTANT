# v1.0.0 — Tenant Core & Platform Control Center

## Delivered

- SaaS tenant, child-platform, domain, feature, and membership data model.
- Protected migration of existing BDG data into `BDG Operations / BDG Help Center`.
- Platform Operator, Tenant Owner, Platform Owner, Platform Admin, Content Manager, AI Manager, Support Analyst, and Viewer roles.
- Platform Control Center in Admin Pro.
- Safe domain lifecycle: planned, pending DNS, verified, disabled.
- Per-platform feature entitlement records for Guide, manual icons, AI Prompt Manager, AI Prompt & Image, AI Knowledge Import, Chat, Buttons, and Diagnostics.
- Explicit GitHub Actions Pages deployment to the `main` branch and verification through `main.*.pages.dev`.

## Verification

- Backend syntax checks pass.
- 51/51 static regression checks pass.
- Admin Pro production build passes.

## Deliberate scope

Tenant rows and server-side role boundaries are live in this release. Full request-level content isolation is the next controlled migration so existing BDG pages continue to work while the data is backfilled.
