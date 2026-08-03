# v1.15.3 — Prompt-First AI Repair

## Backend

- Replaced the default two-stage chat path with one prompt-first DeepSeek call.
- Kept the advanced judge/composer workflow as an optional Admin setting.
- Allowed general questions to follow Role, Job, Output, Language, Safety, and
  other enabled Prompt Manager sections.
- Preferred approved platform content without requiring it for every general
  answer.
- Validated model-selected source IDs against the active tenant/platform
  catalog before attaching content.
- Automatically attached one approved matched-source image and approved action
  buttons; arbitrary model image URLs remain impossible.
- Retried bounded empty JSON-mode responses and accepted safe provider plain
  text when structured parsing was unnecessary.
- Preserved a conservative approved-source fallback during provider outages.
- Added prompt-first resolution paths and diagnostics without exposing provider
  errors to public Chat.

## DeepSeek compatibility

- Changed defaults and Render blueprints from `deepseek-chat` to
  `deepseek-v4-flash`.
- Normalized legacy stored model names at runtime.
- Added immutable migration
  `035_v1.15.3_prompt_first_ai_repair.sql` to repair stored model, workflow,
  approved-only, max-token, and legacy default-prompt values.
- Restricted production provider base configuration to the official HTTPS
  DeepSeek endpoint.

## Admin

- Added AI enablement, model, API base, temperature, output-token, approved-only,
  and memory controls to AI Reliability.
- Added a recommended Prompt-first workflow selector.
- Converted the former simulated safety test into a real provider connectivity
  test with safe diagnostics.

## Testing

- Added real PostgreSQL/API coverage for migration 035, current model selection,
  provider connectivity, one-call general answers, one-call grounded answers,
  matched image delivery, retries, and verified-source outage fallback.
- Source regression suite: 56/56.
- AI reliability suite: 6/6.
