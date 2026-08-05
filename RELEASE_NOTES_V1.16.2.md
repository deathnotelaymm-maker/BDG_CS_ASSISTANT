# Release Notes — v1.16.2

## Conversation Continuity, Realtime Transport and Media Matching Repair

**Release marker:** `1.16.2-conversation-continuity-realtime-media-matching`  
**Base:** v1.16.1-r3  
**Migration:** `040_v1.16.2_conversation_continuity_realtime_media_matching.sql`  
**Next migration:** `041`

## Customer-visible repairs

- Final AI answers, staff replies, assignment changes, and resolution changes
  can arrive without a manual refresh.
- WebSocket delivery is backed by authenticated sequence-based HTTP catch-up.
- Refresh resumes the existing platform conversation instead of starting from
  an empty beginning state.
- Restored conversations scroll to the latest unread message or conversation
  end after message and image layout completes.
- A new-message badge appears when the customer is reading older messages.
- Customer-facing headers use the platform brand and neutral online state.
- Technical labels such as AI provider, socket offline, or internal control
  state are no longer shown to customers.
- AI-job failure does not close the conversation or disable the composer.
- Staff resolution returns the customer to the automated support flow without
  a refresh when the platform setting enables that behavior.
- Customer system messages are localized consistently.

## Realtime and resume architecture

- Added rotating, platform-scoped customer resume keys.
- Added one-time, short-lived realtime tickets.
- Staff realtime tickets revalidate active session version and revocation.
- Added customer and staff sync endpoints using message sequence numbers.
- Added event IDs to realtime packets for deduplication.
- Added customer and staff fallback synchronization intervals.
- Added queue-cancellation support before staff assignment.
- Added stale-state recovery when the browser believes a resolved conversation
  is still human-controlled.

## Menu & Images repair

- Replaced fragile token-only matching with a hybrid server-owned matcher.
- Added localized aliases, alternative spellings, categories, trigger phrases,
  negative examples, token coverage, and character-trigram similarity.
- Changed the default match threshold from 86 to 55 for approved prompt-image
  content, while keeping per-item control.
- The server selects and persists the approved media manifest before calling
  DeepSeek.
- Added Admin Match Tester diagnostics for selected item, score, threshold,
  method, phrase, and media count.
- Added AI-delivery diagnostics for selected content and media.

## Handoff intent repair

- Contact-information questions no longer automatically create live-human
  handoff intent.
- Explicit requests for a representative still follow the configured handoff
  policy.
- Provider failure keeps the conversation active and uses localized safe copy.

## Compatibility

- Prompt-first plain-text AI worker remains active.
- PostgreSQL AI queue and migration `039` remain intact.
- Human Support foundation and migration `038` remain intact.
- Retired AI Q&A, Knowledge Import, Source Router, Locale Studio, and Response
  Quality modules remain outside the production decision path.
- No production secrets or Render settings are changed by the installer.
