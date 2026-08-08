# Release Notes — v1.17.1

**Release:** Verified Domain Mapping & Dynamic CORS Trust  
**Marker:** `1.17.1-verified-domain-mapping-dynamic-cors`  
**Migration:** `044_v1.17.1_verified_domain_mapping_dynamic_cors.sql`

## Added

- Database-controlled API/CORS policy per custom hostname.
- Automatic dynamic CORS activation after verified Cloudflare hostname + SSL readiness.
- Exact HTTPS-origin validation.
- Dynamic CORS status and effective-origin diagnostics in Domain Mapping.
- Admin API/CORS enable/disable switch.
- Short-lived origin lookup cache with mutation invalidation.
- CI regression coverage for the trust contract.

## Hardened

The previous dynamic lookup accepted planned and pending hostnames. v1.17.1 rejects them. Custom-hostname platform resolution now follows the same verified/active/SSL-active policy.

## Unchanged

- BDG official origins continue to use `ALLOWED_ORIGINS`.
- Cloudflare provisioning credentials remain server-side only.
- Client registrar credentials are never collected.
- Existing platform-context mismatch protection remains enforced.
