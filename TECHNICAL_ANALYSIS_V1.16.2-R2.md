# Technical Analysis — v1.16.2-r2

## Root cause

`backend-api/scripts/integration-test.js` uses a fake DeepSeek endpoint to verify the real worker and database flow. Its request classifier used this brittle condition:

```js
systemPrompt.startsWith('You are the production AI assistant')
```

v1.16.2 uses `buildPlainTextSystemPrompt()`, whose current authoritative prefix is `You are the production support assistant`. The test double consequently labeled the request as `composer` rather than `prompt_first`.

The obsolete composer branch returns JSON-encoded response blocks. Because the production worker intentionally accepts any readable plain text, the JSON string was saved as the AI reply. The integration assertion then failed because the reply did not match `/Halo/i`.

## Corrected strategy

The fake provider now recognizes the plain-text worker by semantic contract markers rather than a mutable heading:

```text
Return only the customer-facing answer as plain text
ACTIVE ASSISTANT SETUP RUNTIME
```

This matches the production architecture and remains stable if the assistant title changes again.

## Regression protection

`v1.16.2-conversation-continuity-regression-test.js` now checks that:

- the integration test contains the contract-based classifier;
- both required plain-text markers are present;
- the obsolete exact-prefix classifier is absent.

## Deliberately unchanged

No change was made to:

- DeepSeek production requests;
- plain-text normalization;
- durable AI jobs;
- Menu & Images retrieval;
- WebSocket or HTTP catch-up delivery;
- tenant/platform hostname validation;
- database schema or migration `040`.
