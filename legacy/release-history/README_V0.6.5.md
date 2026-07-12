# v0.6.5 — Prompt-First AI + Optional Guide Delivery

This release changes the chat architecture so AI Prompt Manager is the primary decision source. Guide Attachments are optional support materials only.

## Main behavior

- User message is answered from AI Prompt Manager first.
- Guide images are attached only when clearly useful.
- Unclear messages receive one clarification question before any guide.
- If the user rejects or says the issue is already solved, the previous guide is cancelled.
- Customer-facing chat never shows Smart Match, confidence, matched guide, recommended guide, or backend diagnostics.

## Admin behavior

Use Admin → Guide Attachments to manage optional visual support assets.

Each attachment supports:

- Intent ID
- Positive examples / keywords
- Negative examples / excluded situations
- Attach mode: never / ask first / auto when clear
- When to attach
- When NOT to attach
- English and Hindi/Indian images
- Optional official support text

## Deployment

Run `DEPLOY-ALL-V0.6.5-WINDOWS.ps1`.

Expected Worker health version: `0.6.5-worker`.
