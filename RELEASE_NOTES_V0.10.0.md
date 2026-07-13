# v0.10.0 — AI Knowledge Orchestrator + Multilingual Visual Guide Studio

Release version: `0.10.0-ai-knowledge-orchestrator-multilingual-visual-guide-studio`

## What changed

- Replaced AI Content keyword scoring with a two-stage AI workflow: Meaning Judge → Response Composer.
- The judge considers positive examples, negative boundaries, item instructions, and approved knowledge together. It supports typos, broken English, Hindi, Hinglish, and transliteration.
- Added English and Hindi/Indian rich visual knowledge editors to AI Prompt & Image.
- Added structured-v2 Chat output with safe bold, italic, underline, brand colors, highlights, lists, callouts, approved images, and approved buttons.
- Replaced the Admin Guide block form with a multilingual document-style Visual Guide Studio.
- Added reusable Buttons Configuration for web URLs, internal paths, app deep links, and Chat prompts.
- Added durable Site Content deletion using tombstones; deleted default keys cannot return after refresh or cold start.
- Added unified version history and restore for AI Content, Guides, Site Content, Buttons, and Prompt Manager versions.
- Preserved the v0.9.0a exact-length R2 upload fix and request-ID diagnostics.

## Safety rules

- Only published and approved AI Content enters the AI judge catalog.
- Images and example-answer formatting never create a topic match.
- The composer can reference only images and buttons assigned by Admin.
- Arbitrary model URLs and unsafe schemes are rejected.
- If the AI provider fails, Chat shows a neutral technical-unavailable message; it does not invent a business answer.

## Compatibility

- Existing English AI Content and Guides remain valid.
- Existing published AI Content is approved once during the v0.10.0 migration.
- Existing Guide block JSON continues to render; new Guide edits use structured document JSON.
