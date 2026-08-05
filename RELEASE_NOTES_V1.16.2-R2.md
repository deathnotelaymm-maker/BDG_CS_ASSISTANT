# v1.16.2-r2 — Plain-Text Provider Test Contract Hotfix

## Problem

The v1.16.2 production worker correctly builds a plain-text system prompt beginning with:

```text
You are the production support assistant ...
```

The PostgreSQL integration test double still classified prompt-first requests only when the system prompt began with the obsolete text:

```text
You are the production AI assistant ...
```

The current request was therefore misclassified as the retired composer path. The fake composer returned legacy JSON text:

```json
{"reply":"Verified answer","blocks":[{"type":"paragraph","text":"Verified answer"}]}
```

The production plain-text normalizer treated that payload as readable text, so the greeting assertion received JSON text instead of the expected Indonesian `Halo` response.

## Repair

The integration provider now identifies prompt-first requests from stable plain-text contract markers:

- `Return only the customer-facing answer as plain text`
- `ACTIVE ASSISTANT SETUP RUNTIME`

It no longer depends on a product-name prefix that can change between releases.

A new v1.16.2 regression guard verifies that the integration provider recognizes the current plain-text runtime contract and does not restore the obsolete prefix check.

## Security note

The logged `PLATFORM_CONTEXT_MISMATCH` HTTP 400 remains intentional. It proves that a route cannot be used through an unrelated custom hostname. That guard was not weakened or bypassed.

## Compatibility

- Application version remains `1.16.2`.
- Release marker remains `1.16.2-conversation-continuity-realtime-media-matching`.
- Migration `040` remains unchanged.
- Next migration remains `041`.
