LUKE v1.17.2 — SHARED HOSTING MODE & PLATFORM ROUTE RESOLUTION
=================================================================

Base: v1.17.1-r2
Runtime version: 1.17.2
Release marker: 1.17.2-luke-shared-hosting-platform-route
Migration: 045_v1.17.2_luke_shared_hosting_platform_route.sql
Next migration: 046

WHAT THIS RELEASE ADDS
----------------------
1. Luke Shared Hosting and Custom Domain hosting modes.
2. Shared Admin/Staff/Guide/Chat links under ar-ai666.com.
3. Immutable /p/<platform-route> resolution for shared clients.
4. Shared Luke origins trusted once as exact first-party infrastructure origins.
5. Route-scoped Staff login protection.
6. Admin shared-route support and verified custom-hostname root resolution.
7. White-label cleanup so legacy BDG branding is not required in the client experience.
8. Existing v1.17.1 verified custom-domain Dynamic CORS remains active.

SHARED URL FORMAT
-----------------
Admin: https://admin.ar-ai666.com/p/<platform-route>
Staff: https://staff.ar-ai666.com/p/<platform-route>
Guide: https://guide.ar-ai666.com/p/<platform-route>
Chat:  https://chat.ar-ai666.com/p/<platform-route>

ONE-TIME CLOUDFLARE SETUP
-------------------------
Attach each ar-ai666.com hostname to its correct Cloudflare Pages project and wait for Active SSL status.
No per-client DNS record or CORS change is required for Luke Shared Hosting after that.

INSTALL
-------
Run START-HERE-WINDOWS.bat from this extracted package.
Default target:
C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT

The installer creates a changed-file rollback backup. It does not commit, push, deploy, access production secrets, or apply migration 045.

Recommended Git commit:
v1.17.2 Luke Shared Hosting Mode and Platform Route Resolution
