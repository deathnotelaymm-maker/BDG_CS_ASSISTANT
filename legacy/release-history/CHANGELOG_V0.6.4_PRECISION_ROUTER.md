# v0.6.4 — Precision AI Router + Conversation State + Safe Guide Delivery

## Main change
Smart Match Guide is no longer the first decision-maker. The Worker now routes chat through a precision intent layer first, then decides whether to send a guide, ask one clarification, require confirmation, or escalate.

## Added
- Intent-first AI Router before Smart Match Guide delivery.
- Confidence bands: direct-send, clarify, fallback.
- Best-vs-second-best confidence gap check.
- Required-field detection for guide intents.
- Negative examples and excluded-situation support.
- Risk levels: normal, sensitive, restricted.
- Safe guide delivery: no internal SMART MATCH / confidence text in customer chat.
- AI Test Lab response now returns decision trace fields.
- Incorrect match report API.
- Knowledge versions API.
- Conversation state columns for active intent, selected language, confirmed issue, and unresolved question.
- Admin Smart Match editor fields for intent id, examples, risk level, required fields, escalation controls, and response layout.

## Kept
- Owner/Admin role structure.
- Owner-only Admin Users section.
- 2FA support structure.
- Single-session login structure.
- Enhanced audit log structure.

## Safety
- Deploy script checks the first Worker line and runs node --check before deploying.
- No PowerShell JavaScript rewriting is used.
