# v1.17.2 — Luke Shared Hosting Mode & Platform Route Resolution

v1.17.2 introduces **Luke** as the neutral white-label shared hosting layer while preserving the verified custom-domain workflow from v1.17.1.

**Base:** v1.17.1-r2  
**Release marker:** `1.17.2-luke-shared-hosting-platform-route`  
**Migration:** `045_v1.17.2_luke_shared_hosting_platform_route.sql`  
**Next migration:** `046`

## Hosting modes

Each platform can use one of two management modes:

- **Luke Shared Hosting** — uses the four permanent `ar-ai666.com` application hosts plus the platform's immutable `/p/<platform-route>` path.
- **Custom Domain** — keeps the verified Cloudflare Custom Hostname + Dynamic CORS workflow from v1.17.1.

Shared links are generated automatically:

- `https://admin.ar-ai666.com/p/<platform-route>`
- `https://staff.ar-ai666.com/p/<platform-route>`
- `https://guide.ar-ai666.com/p/<platform-route>`
- `https://chat.ar-ai666.com/p/<platform-route>`

The four Luke origins are trusted once by the backend's static infrastructure CORS layer. A new shared-hosting client therefore needs no per-client DNS, SSL, or Render CORS change.

## White-label rule

Luke is infrastructure, not the client's brand. Platform brand settings continue to control the visible Chat, Guide, Staff, and Admin experience. New client-facing defaults no longer advertise the legacy BDG name. Internal legacy environment variables, headers, package names, migration history, and database identifiers remain unchanged where renaming them would risk compatibility.

## Platform-route rule

`public_route_key` remains the stable public platform identifier. v1.17.2 does not rewrite existing route keys. Changing a platform display name does not change the public route.

## Custom domains

Verified client-owned domains still use the v1.17.1 readiness contract: exact HTTPS origin, API/CORS enabled, active provisioning, verification recorded, active Cloudflare hostname and SSL, and active tenant/platform.

Follow `DEPLOYMENT_CHECKLIST_V1.17.2.md` before production rollout.
