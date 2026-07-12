# Changelog — v0.6.5

## Added

- Prompt-first chat architecture.
- Optional guide delivery after AI answer.
- Guide attach modes.
- Guide Usage Policy prompt section.
- When-to-attach and when-not-to-attach rules.
- Admin UI label changed from Smart Match Guide to Guide Attachments.
- Health feature flags for prompt-first AI and optional guide delivery.

## Changed

- Smart/guide matching is no longer the main answer source.
- Chat response uses AI Prompt Manager first.
- Guide images attach only when useful and clear.
- DeepSeek no longer skips only because no guide/FAQ matched when AI model is enabled.

## Fixed

- Prevents wrong guide-first answers for vague user messages.
- Keeps backend diagnostics hidden from public chat.
