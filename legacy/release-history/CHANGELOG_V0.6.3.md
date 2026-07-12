# Changelog — v0.6.3

## Added

- Clarify-first Smart Match decision engine.
- Confidence thresholds for Smart Match guides.
- Required confirmation option per Smart Match Guide.
- Negative keywords per Smart Match Guide.
- Rich Smart Match reply blocks.
- Smart Match testing support with confidence and preview.
- TOTP 2FA support for admin login.
- Owner-only Admin Users access.
- Owner reset 2FA and force logout controls.
- Session-version single-session login protection.
- Enhanced audit logging for security and Smart Match changes.

## Changed

- Chat no longer sends a guide just because one vague keyword matched.
- Chat asks clarification for unclear messages like “my account number”.
- Chat no longer displays `SMART MATCH` labels to users.
- Chat strips raw Markdown `**` markers before displaying replies.
- AI Prompt Manager remains the central AI behavior control.

## Fixed

- Wrong guide selection for vague account/bank messages.
- Normal admins seeing owner-only admin controls.
- Old sessions remaining active after another login.
