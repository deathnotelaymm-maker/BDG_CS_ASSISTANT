# v1.17.1 — Verified Domain Mapping & Dynamic CORS Trust

v1.17.1 turns Domain Mapping into the production authority for client custom-domain API trust. Client domains no longer need to be manually appended to Render `ALLOWED_ORIGINS` after each onboarding.

**Base:** v1.17.0-r2  
**Release marker:** `1.17.1-verified-domain-mapping-dynamic-cors`  
**Migration:** `044_v1.17.1_verified_domain_mapping_dynamic_cors.sql`  
**Next migration:** `045`

## Production rule

`ALLOWED_ORIGINS` remains the static allowlist for BDG-owned infrastructure origins. A client custom origin is accepted dynamically only when all of these are true:

- exact HTTPS hostname match;
- Domain Mapping API/CORS policy is enabled;
- domain record is not archived;
- provisioning status is `active`;
- verification timestamp exists;
- Cloudflare hostname status is `active`;
- Cloudflare SSL status is `active`;
- tenant and platform are active.

Pending, planned, disabled, HTTP, port-qualified, unknown, archived, or SSL-incomplete origins remain blocked.

## Client onboarding

1. Add the client's Chat, Guide, Admin, or Staff hostname in **Domain Mapping**.
2. Leave **API / CORS** enabled unless the hostname should not call the API.
3. Provision through Cloudflare Custom Hostnames.
4. Give the client the displayed TXT/CNAME records.
5. Refresh status until both hostname and SSL are active.
6. Dynamic CORS becomes effective automatically. No Render environment edit is required.

Follow `DEPLOYMENT_CHECKLIST_V1.17.1.md` before production rollout.
