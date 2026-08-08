# v1.17.3 — Support Workspace UX, Admin Support Access & Tenant Isolation Repair

## Summary
This release makes the Luke Support Workspace the primary operational customer-service console for Staff and Admin while tightening platform isolation for shared Staff URLs.

## Highlights
- Luke shared Staff URLs require `/p/{platform_route}` before staff authentication.
- Verified client-owned Staff hostnames may resolve platform context without a route.
- Admin accounts can sign in to the Support Workspace without impersonating Staff; Staff accounts still cannot access Admin.
- Reply and Internal Note modes are explicit; Internal Notes are staff/admin-only and never delivered to customers.
- Customer messages render left; automated support, Staff and Admin replies render right.
- Queue, assignment, transfer and resolution events render as compact centered status events.
- Independent visible scrollbars for conversation list, message timeline and context/shortcuts panel.
- New messages auto-follow to the latest message while deliberate older-history loading preserves position.
- Public automated-support, staff and admin display names/avatars are configurable and used as chat heads.
- Customer Chat uses a fixed viewport shell, sticky compact support status, fixed composer and a hamburger conversation drawer.
- Broken promotional images are hidden rather than showing broken-media placeholders.
- Admin Customer Service now directs live operations to the shared Luke Support Workspace while retaining configuration controls.

## Database
Migration `046_v1.17.3_support_workspace_ux_admin_access_tenant_isolation.sql` adds public support identity and chat-menu presentation settings. Next migration: 047.
