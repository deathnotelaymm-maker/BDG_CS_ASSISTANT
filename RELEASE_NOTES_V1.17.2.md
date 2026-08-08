# Release Notes — v1.17.2

## Luke Shared Hosting Mode & Platform Route Resolution

This release adds a neutral white-label shared hosting mode for clients that do not want to purchase or manage a custom domain.

### Shared Luke applications

- Admin: `https://admin.ar-ai666.com/p/<platform-route>`
- Staff: `https://staff.ar-ai666.com/p/<platform-route>`
- Guide: `https://guide.ar-ai666.com/p/<platform-route>`
- Chat: `https://chat.ar-ai666.com/p/<platform-route>`

The four shared hostnames are configured once. Platform isolation comes from the immutable route, not from creating a new DNS record per client.

### Dual hosting mode

Domain Mapping now exposes **Luke Shared Hosting** and **Custom Domain**. Custom Domain continues to use verified Cloudflare hostname provisioning and database-driven Dynamic CORS.

### Shared-host CORS

The configured Luke shared origins are trusted as first-party infrastructure origins by the backend. This removes per-client CORS work for shared hosting. `ALLOWED_ORIGINS` remains the static allowlist for other permanent infrastructure origins such as the Pages.dev deployment URLs. Production wildcard CORS remains prohibited.

### Route-safe Admin and Staff

Admin now accepts `/p/<platform-route>` directly while preserving the legacy `/p/<platform-route>/admin` form. Staff extracts the route from `/p/<platform-route>` and sends it to the backend; staff login rejects a route that does not match the staff account's platform.

Verified custom-domain Admin roots can resolve their platform from the exact verified hostname.

### Guide and Chat hostname mode

Guide and Chat no longer inject a synthetic `default` platform identifier when there is no route. That allows a verified client-owned hostname to remain the platform authority.

### White-label cleanup

New production defaults and visible hosting-management copy use Luke or neutral client wording instead of legacy BDG branding. Internal legacy identifiers remain intentionally compatible.

### Database

Migration `045_v1.17.2_luke_shared_hosting_platform_route.sql` adds `hosting_mode` and preserves all existing `public_route_key` values. Existing platforms with an active custom-domain mapping are backfilled to `custom_domain`; other existing platforms default to `luke_shared`.
