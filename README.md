# v1.17.4 — CS Workspace Identity, Domain & Promotion UX Upgrade

v1.17.4 upgrades the customer-service identity, shared CS domain, customer Chat layout, Staff profile controls, Chat Menu, and promotional experience while preserving the v1.17.3 tenant-isolated Support Workspace foundation.

**Base:** v1.17.3  
**Release marker:** `1.17.4-cs-identity-domain-promotion-menu-upgrade`  
**Migration:** `047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql`  
**Next migration:** `048`

## Luke shared application URLs

- Admin: `https://admin.ar-ai666.com/p/<platform-route>`
- CS Workspace: `https://cs.ar-ai666.com/p/<platform-route>`
- Guide: `https://guide.ar-ai666.com/p/<platform-route>`
- Chat: `https://chat.ar-ai666.com/p/<platform-route>`

The internal compatibility identifier remains `site_kind = staff`; the customer-facing application is presented as **CS Workspace**. A verified client-owned CS custom domain may continue to resolve the exact platform without the shared `/p/<platform-route>` suffix.

## Customer Chat layout

- Customer messages: right.
- Automated Support, Staff, and Administrator replies: left.
- System events: compact centered status text.
- Internal Notes: Staff/Admin only and never returned by the public customer message stream.

## Identity management

Staff can use **My Profile** to manage their internal display name/profile picture and, when allowed by Admin policy, their public support name/chat avatar. Admin can manage both internal and public Staff identity plus the Automated Support and Administrator public identities.

## Customer Chat Menu and Promotions

The hardcoded Help section is removed. Admin now manages Conversation, Promotions, Privacy, and safe custom menu items. Promotion cards support slideshow navigation, rich sanitized content, badges, CTA labels, image preview, drawer visibility, schedule/order, and the existing human-support visibility policy.

## Production rule

Do not edit migration `047` after deployment. Run the normal CI and PostgreSQL migration pipeline before production release. Follow `DEPLOYMENT_CHECKLIST_V1.17.4.md`.
