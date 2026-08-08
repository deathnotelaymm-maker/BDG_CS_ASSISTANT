# Luke Shared Hosting & Platform Route Architecture — v1.17.2

## Shared hosting

The same four Cloudflare Pages custom hostnames serve every shared-hosting platform:

```text
admin.ar-ai666.com
staff.ar-ai666.com
guide.ar-ai666.com
chat.ar-ai666.com
```

A platform-specific URL is formed by appending its immutable public route:

```text
https://chat.ar-ai666.com/p/<platform-route>
```

DNS resolves only the hostname. The application and backend resolve the platform route.

## Client-owned custom domain

A client that wants its own hostname can continue to use:

```text
chat.client.example
staff.client.example
admin.client.example
guide.client.example
```

Those hostnames are verified and activated through Domain Mapping. No route suffix is required once the verified hostname itself is the platform authority.

## Resolution decision

```text
Request
  |
  +-- Luke/shared infrastructure hostname
  |      -> resolve /p/<platform-route>
  |      -> tenant + platform scope
  |
  +-- verified client hostname
         -> resolve exact hostname
         -> tenant + platform scope
```

Every downstream API operation continues to enforce tenant and platform scope. A route/hostname disagreement remains a `PLATFORM_CONTEXT_MISMATCH` rather than falling back to another platform.

## Client onboarding

For Luke Shared Hosting, creating a platform is enough to generate all four links. There is no client DNS setup, no client SSL setup, and no per-client Render CORS update.

For Custom Domain, continue to use the Domain Mapping Cloudflare verification workflow.
