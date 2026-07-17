# v1.3.0 — Chat Start Module + Experience Studio

## Outcome

Every active platform can now present its own configurable chat entry experience
before the first message. Settings are read and written through the existing
tenant/platform scope, so one tenant cannot inherit another platform's start
screen, image, notices, or theme.

## Included

- Tenant-scoped Chat Start Module with title, safe rich text, image, notices, and a
  configurable Start chat button.
- Existing platform quick replies are shown as a mobile-friendly button grid on
  the start screen.
- Safe animation presets: none, fade, slide, pulse, and typing.
- Chat layout presets: standard, compact, and centered.
- Bubble and input style presets plus per-platform accent, surface, font, and
  background settings.
- Admin Theme Settings fields for the full experience editor, including image
  upload through the existing R2 upload path.
- Backend validation rejects unknown animation/layout/style values and the public
  client accepts only HTTPS or same-origin upload images.
- Additive, idempotent migration marker:
  `v1.3.0_chat_start_module_experience_studio`.

## Boundaries

This release does not add game/payment connectors. That remains the planned v1.4.0
Operations Connector Gateway, where the backend will enforce approved tools and
the AI will never invent an operational status.

## Validation

- Backend syntax check passed.
- 76/76 static regression checks passed.
- 4/4 structured-response checks passed.
- 4/4 upload checks passed.
- 5/5 knowledge-import checks passed.
- Admin, Chat, and Guide production builds passed.

No GitHub push or production deployment is performed by the installer.
