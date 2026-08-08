# Verified Domain Mapping & Dynamic CORS — v1.17.1

## Goal

Remove the operational requirement to edit Render `ALLOWED_ORIGINS` every time a SaaS client activates a custom domain, without weakening tenant isolation or accepting unverified hostnames.

## Trust layers

### Static infrastructure trust

`ALLOWED_ORIGINS` is retained for BDG-owned Pages/custom infrastructure origins. It must not contain `*` in production.

### Dynamic client trust

Client domains are loaded from `saas_platform_domains`. A domain is effective only when its policy is enabled and Domain Mapping proves production readiness. Domain existence alone is not sufficient.

## Security properties

- exact HTTPS origin only;
- no arbitrary port or path-bearing origin;
- pending DNS/SSL is denied;
- archived domains are denied;
- inactive tenant/platform is denied;
- API/CORS can be revoked per hostname;
- hostname-based platform resolution uses the same readiness contract;
- short positive/negative caches reduce database pressure and are invalidated after domain mutation/synchronization.

## Admin behavior

Domain Mapping shows **API / CORS** for each hostname:

- **Enabled + waiting:** policy is ready but DNS/SSL is not production-ready;
- **Automatically trusted:** exact origin is live and accepted;
- **Disabled:** backend refuses dynamic CORS for that hostname even if Cloudflare remains active.
