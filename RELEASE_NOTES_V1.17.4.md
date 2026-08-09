# v1.17.4 — CS Workspace Identity, Domain & Promotion UX Upgrade

## Summary
v1.17.4 corrects the customer Chat sender layout, makes `cs.ar-ai666.com` the canonical Luke shared CS Workspace origin, adds Staff self-profile management with separate internal/public avatars, centralizes support identities in Admin, removes the hardcoded Help drawer, and upgrades Promotions into a managed rich slideshow.

## Customer Chat
- Customer/user messages render on the right.
- Automated Support, Staff, and Administrator replies render on the left with support chat heads.
- System events remain centered and Internal Notes remain private.
- The hamburger drawer no longer duplicates quick-help buttons.

## CS domain and login
- Shared CS origin defaults to `https://cs.ar-ai666.com`.
- Shared platform URL is `https://cs.ar-ai666.com/p/<platform-route>`.
- Staff and Administrator login modes remain in one CS Workspace application.
- Missing shared platform route and cross-platform route/hostname mismatches are rejected.
- Internal `staff` site-kind/environment identifiers are retained for compatibility.

## Staff profile and chat identity
- New Staff **My Profile** screen.
- Staff can change internal display name and profile picture when permitted.
- Public support name/chat avatar are separate from the internal account profile.
- Admin policy can disable Staff profile editing or public identity editing.
- Identity image upload accepts verified PNG/JPEG/WEBP up to 5 MB.

## Admin management
- Staff Accounts can edit internal profile picture, name, public support name, and chat avatar.
- New **Support Identities** section manages Automated Support and Administrator names/avatars plus Staff public-identity policy.
- Existing account controls such as password reset, force logout, status, and conversation limits remain.

## Chat Menu
- New Admin-managed Chat Menu configuration.
- Conversation, Promotions, and Privacy sections can be enabled/disabled and relabeled.
- Privacy copy is managed centrally.
- Safe custom menu items support HTTPS links or predefined chat prompts.
- Arbitrary HTML/JavaScript actions are not accepted.

## Promotions
- Drawer uses all eligible promotions rather than only the first record.
- Multi-slide navigation, indicators, and autoplay support are available.
- Rich promotion content is sanitized on the backend before public delivery.
- Badge, CTA label, drawer visibility, image preview, placement, order, schedule, and enabled state are managed from Admin.
- Existing hide-during-human-support behavior remains available.

## Realtime repair included
Staff permanent conversation streams now send the Authorization header and parse canonical SSE framing instead of treating the stream as line-delimited JSON. WebSocket remains for presence/typing while PostgreSQL + SSE remain the permanent message path.

## Database
Migration `047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql` adds separate Staff profile-avatar storage, Staff identity-edit policies, managed chat-menu JSON, and rich promotional fields. Migration `046` is unchanged. Next migration: `048`.
