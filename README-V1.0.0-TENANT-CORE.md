# v1.0.0 — Tenant Core & Platform Control Center

## What this release changes

BDG Help Center is now prepared to operate as a commercial AI customer-service platform.

The hierarchy is:

1. **Platform Operator** — the BDG business owner.
2. **Client company (tenant)** — the company renting the service.
3. **Child platform** — a client brand, market, or product that owns its own Chat, Guide, Admin team, AI setup, icons, and domains.

The existing BDG Help Center is safely adopted into a protected **BDG Operations → BDG Help Center** tenant/platform. No current guide, FAQ, AI content, button, image, or chat log is deleted.

## New Admin screen

Open **Platform Control Center** from the Admin navigation.

- Create a client company.
- Create one or more child platforms under that company.
- Assign a child-platform owner or other role.
- Record separate Chat, Guide, and Admin domains.
- Turn included modules on or off for the platform.

Domain records start as **planned**. They become live only after the Cloudflare custom hostname and DNS are configured and then marked **verified**. The application never claims a domain is live before that step.

## Roles

| Role | Scope |
| --- | --- |
| Platform Operator | All client companies and all child platforms |
| Tenant Owner | All child platforms in one client company |
| Platform Owner | One child platform and its team/settings |
| Platform Admin | Operational settings for one child platform |
| Content Manager | Guide, FAQ, tutorial, icons, and site content |
| AI Manager | AI Prompt Manager, AI Prompt & Image, imports, and AI tests |
| Support Analyst | Chat logs and diagnostics |
| Viewer | Read-only access |

## Important rollout boundary

This is the safe **tenant core** release. It stores the server-side tenant and platform boundary, membership rules, domain registry, feature entitlements, and backfilled ownership for existing data.

The next release should apply `platform_id` scope predicates to every Guide, FAQ, AI Content, theme, button, chat session, and log read/write. Do not rent a client platform to a separate customer until that isolation release is complete.

## Simple installation

1. Extract the release ZIP.
2. Double-click `INSTALL-V1.0.0-TENANT-CORE.cmd`.
3. It only accepts `C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT`; it refuses the Myanmar 2D repository and refuses a dirty Git working tree.
4. Open GitHub Desktop, choose **BDG_CS_ASSISTANT**, commit the displayed changes, and push to `main`.

No PowerShell command is required. The installer does not run npm, deploy, or push anything by itself.
