# Technical Analysis — v1.17.2

## Problem

A multi-tenant platform cannot require a new DNS record, SSL certificate workflow, and backend CORS edit for every client that is happy to use provider-owned infrastructure. At the same time, client-owned custom domains must remain strongly isolated and verified.

## Resolution model

v1.17.2 uses two platform-resolution paths:

1. **Luke shared host** — the application hostname identifies the application, while `/p/<public_route_key>` identifies the tenant/platform.
2. **Verified custom hostname** — the exact active hostname identifies the tenant/platform through `saas_platform_domains`.

The same PostgreSQL tenant/platform scope is used after either resolution path.

## Shared origin trust

The four configured `LUKE_SHARED_*_ORIGIN` values are first-party application origins. `allowedOrigin()` combines them with the existing `ALLOWED_ORIGINS` infrastructure list. This is not wildcard trust and does not permit arbitrary `*.ar-ai666.com` origins.

## Platform-route immutability

Migration 045 does not rewrite `public_route_key`. Route keys therefore survive display-name edits and remain stable URLs for customers and staff.

## Staff protection

The Staff frontend extracts the platform route from the current URL and sends `X-BDG-Platform-Route` as an internal compatibility header. The backend verifies that the authenticated staff account belongs to that route's platform and returns `SUPPORT_PLATFORM_ROUTE_MISMATCH` on mismatch.

The legacy header name is deliberately retained as an internal protocol identifier; it is not customer-facing branding.

## Admin protection

Shared Admin routes carry `/p/<route>`. Verified client-owned Admin domains can resolve through the exact verified Origin hostname. Membership and platform-manager checks still run after platform resolution.

## Custom-domain compatibility

The v1.17.1 Dynamic CORS contract remains unchanged. Pending, unverified, disabled, HTTP, port-qualified, SSL-incomplete, cross-platform, and archived client hostnames do not become trusted custom origins.

## White-label boundary

Client-facing defaults are neutralized while legacy package names, environment keys such as `VITE_BDG_API_BASE`, internal compatibility headers, migration history, and protected legacy bootstrap data remain unchanged to avoid a risky global rename.
