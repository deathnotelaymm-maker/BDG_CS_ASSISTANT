# Luke CS v1.18.0 Technical Analysis

## Baseline

This release is based on the user's real Luke CS v1.17.4 source. The older
Commerce Connector prototype was originally built against v1.15.3/v1.16.0 and
was not overlaid directly because doing so would overwrite later support,
realtime, prompt-runtime, domain and UI work.

## Integration architecture

Luke Shop Customer Web obtains a short-lived signed commerce context from the
Shop backend and passes it to the Luke CS Chat iframe using an exact-origin
postMessage bridge. Chat stores it in sessionStorage and sends it only in the
chat POST body. Luke CS backend resolves the platform-scoped connector,
exchanges the encrypted long-lived credential for a short-lived Shop service
token and calls the Shop read-only tool gateway with the signed context, a
fresh timestamp and a nonce.

The model receives only verified read-only commerce facts. Customer-provided
text and values inside connector responses are explicitly treated as data, not
instructions.

## Compatibility work

v1.17.4 changed the AI runtime to a compiled plain-text Prompt Manager flow and
introduced the professional support workspace. Commerce facts are therefore
appended to the current plain-text system prompt rather than restoring the old
JSON decision runtime. Existing human-handoff, SSE, queue, staff/admin and
prompt-runtime code remains authoritative.

## Database

Migration 048 creates `platform_commerce_connectors` and
`commerce_connector_audit_logs`. It is idempotent and becomes immutable after
production application.
