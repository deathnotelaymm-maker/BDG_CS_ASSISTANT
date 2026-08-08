BDG v1.17.1 - Verified Domain Mapping & Dynamic CORS Trust

Client custom domains no longer need to be manually copied into Render ALLOWED_ORIGINS.
Keep ALLOWED_ORIGINS for official BDG infrastructure only.

A client hostname is accepted automatically only after:
- API / CORS is enabled in Domain Mapping
- provisioning status is active
- verification is recorded
- Cloudflare hostname status is active
- Cloudflare SSL status is active
- the tenant and platform are active

Pending or unverified domains remain blocked.

Migration: 044
Next migration: 045
