# Technical Analysis — v1.17.1

## Previous weakness

The v1.17.0-r2 backend already attempted database-backed custom-origin CORS, but the lookup accepted `planned`, `pending_dns`, and `pending_ssl` records. A hostname being present in Domain Mapping was therefore treated as too much authority.

## New decision contract

The Node server first checks the static `ALLOWED_ORIGINS` list. If no static match exists, it resolves the exact HTTPS origin through `resolveVerifiedCustomHostnameCorsOrigin()`.

The SQL lookup requires `cors_allowed = TRUE`, active provisioning, a verification timestamp, Cloudflare hostname status active, SSL status active, and active tenant/platform rows.

## Cache

Verified origins use a 15-second in-process cache. Negative lookups use a 3-second cache. Domain create/update/delete, Cloudflare synchronization, verification reset, and API/CORS policy changes invalidate the relevant hostname entry.

## Revocation

Disabling API/CORS immediately clears the activation timestamp and cache. Archiving a hostname does the same. The next request is rejected with `CORS_ORIGIN_NOT_TRUSTED`.

## Scaling

The cache is only an optimization; PostgreSQL remains authoritative. Multiple backend instances may have independent short-lived caches. Revocation remains bounded by the positive TTL even without shared cache invalidation. A later Redis backplane can provide cross-instance invalidation if required.
