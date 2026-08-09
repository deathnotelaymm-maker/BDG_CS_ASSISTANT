LUKE v1.17.4 — CS WORKSPACE IDENTITY, DOMAIN & PROMOTION UX UPGRADE
===================================================================

Base: v1.17.3
Runtime version: 1.17.4
Release marker: 1.17.4-cs-identity-domain-promotion-menu-upgrade
Migration: 047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql
Next migration: 048

WHAT THIS RELEASE CHANGES
-------------------------
1. Customer messages are RIGHT; AI/Staff/Admin support replies are LEFT.
2. Luke shared CS Workspace origin is https://cs.ar-ai666.com.
3. Staff and Administrator login remain together in the platform-scoped CS Workspace.
4. Staff gets My Profile with internal name/profile picture and separate public support name/chat avatar.
5. Admin can manage Staff internal/public identity and AI/Admin support identities.
6. The hardcoded Help drawer section is removed.
7. Admin gets a managed Chat Menu configuration.
8. Promotions support rich sanitized content, CTA, image preview, and a multi-slide drawer carousel.
9. Staff SSE delivery now uses authenticated canonical SSE parsing.
10. Migration 047 adds only the fields needed for this release; migration 046 is unchanged.

SHARED URL FORMAT
-----------------
Admin:        https://admin.ar-ai666.com/p/<platform-route>
CS Workspace: https://cs.ar-ai666.com/p/<platform-route>
Guide:        https://guide.ar-ai666.com/p/<platform-route>
Chat:         https://chat.ar-ai666.com/p/<platform-route>

INSTALL
-------
Run START-HERE-WINDOWS.bat from the extracted repair package.
Default target:
C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT

The installer verifies the repair payload, validates a v1.17.3/v1.17.4 target with migration 046, creates a changed-file rollback backup, copies only reviewed files, verifies installed SHA-256 values, and runs dependency-free source checks when Node.js is available.

The installer does NOT commit, push, deploy, access production secrets, or apply migration 047.

Recommended Git commit:
v1.17.4 CS Workspace Identity Domain and Promotion UX Upgrade
