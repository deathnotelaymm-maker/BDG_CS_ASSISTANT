# v1.16.3 Architecture Decision

## Admin platform contract

Every platform-scoped Admin feature uses `/admin/platform-context` to identify
the active tenant and platform. Feature pages then use their own APIs. A content
feature must not depend on Customer Service platform-listing routes.

## Conversation pending rule

Only one `ai_jobs` row with status `QUEUED`, `PROCESSING`, or `RETRYING` may
exist for a conversation. Enforcement exists at three levels:

1. Chat composer disabled state.
2. Row-locked backend check returning `CONVERSATION_RESPONSE_PENDING`.
3. PostgreSQL unique partial index.

## History contract

Initial or resumed customer history contains the latest ten visible messages.
Older pages use a sequence cursor:

```text
GET /support/customer/conversations/:publicId/history
    ?before_sequence=<oldest-loaded-sequence>
    &limit=10
```

## Appearance ownership

Guide and Chat use separate typed settings tables. The legacy theme row remains
for compatibility and rollback but is no longer the sole owner of both product
surfaces.

## Button ownership

Buttons are a platform engagement feature, not an AI source. The same global
label/action is shown across customer languages.
