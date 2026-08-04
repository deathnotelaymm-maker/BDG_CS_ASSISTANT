# Release Notes — v1.15.5 Simplified AI Production Runtime

Release marker: `1.15.5-simplified-ai-production-runtime`

## Objective

The previous AI workspace exposed several overlapping systems. Even when Prompt
Manager was correct, AI Q&A, imported knowledge, configurable routing,
approved-source blocking, locale configuration, quality processing, and old
conversation state made the result difficult to predict.

v1.15.5 reduces production to one understandable contract:

```text
Assistant Setup + approved Menu & Images + one provider call
```

## User-facing changes

The Admin AI navigation now contains only:

- **Assistant Setup**
- **Menu & Images**
- **Test & Diagnostics**
- **Buttons (Optional)**

Old AI URLs redirect to the supported replacement page.

## Backend changes

- Retired AI endpoints return HTTP `410` and `AI_MODULE_RETIRED`.
- Live routing accepts only approved and published `prompt_image` content.
- General questions are allowed when no menu source matches.
- `require_approved_context` is forced off.
- `workflow_mode` is forced to `prompt_first`.
- The configurable source order is replaced by the immutable order
  `['prompt_image']`.
- Ordinary greetings and help requests use Assistant Setup; only hard safety
  boundaries use deterministic local replies.
- Message language is detected automatically when no explicit supported locale
  is supplied.
- `auto`, `automatic`, `detect`, and `all` explicitly request detection.
- Model-selected content IDs are checked against the exact tenant/platform
  candidate list before images or buttons are attached.

## Assistant Setup

The page now combines:

- AI enabled state
- model
- temperature
- maximum output tokens
- conversation memory
- memory length and retention
- provider retries
- provider timeout
- fallback behavior
- human handoff URL
- the ten structured prompt sections
- exact compiled runtime preview and hash

Every prompt change still creates an immutable runtime version and resets
incompatible old assistant memory.

## Menu & Images

This is now the only business-content source used by live AI. An item must meet
all of these conditions:

```text
source_type = prompt_image
status = published
approval_status = approved
deleted_at = null
correct tenant/platform
compatible locale
```

The Admin editor always saves `source_type='prompt_image'`.

## Retired modules

The following modules are removed from live production:

- AI Knowledge Import
- AI Q&A
- Configurable AI Source Router
- AI Locale Studio
- AI Response Quality
- Advanced two-stage AI routing

Prompt history and reliability storage remain internal because runtime rollback,
prompt hashes, retries, timeout, memory, and fallback still require them. They no
longer operate as separate response-decision systems.

## Database migration

`037_v1.15.5_simplified_ai_production_runtime.sql`:

- sets approved-context blocking to false;
- fixes reliability workflow to prompt-first;
- disables historical source-router rows;
- limits historical router source data to `prompt_image`;
- archives old Q&A records;
- records an immutable migration marker.

Historical tables are preserved for rollback and audit. A later cleanup release
may remove unused code and tables after production stability is confirmed.

## Compatibility

- Existing Prompt Manager sections remain supported.
- Existing approved `prompt_image` items remain supported.
- Existing menu images and action buttons remain supported.
- Existing chat sessions are preserved, but incompatible assistant memory resets
  when the prompt runtime changes.
- Old AI Admin links redirect instead of rendering broken pages.
- Old direct API clients receive a clear HTTP 410 response.

## Versioning

This is a real application version increment:

```text
v1.15.4-r2 -> v1.15.5
```
