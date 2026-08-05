# Technical Analysis — v1.16.1-r3

## Root cause

`backend-api/scripts/integration-test.js` retained the old synchronous test flow:

```text
POST /chat → HTTP 200 → final AI reply in the response body
```

The v1.16.1 runtime intentionally uses:

```text
POST /chat → HTTP 202 → queued PostgreSQL AI job
                         ↓
                  background worker
                         ↓
             saved support message + realtime event
```

The assertion failed with `actual: 202, expected: 200` before the worker could be exercised.

## Updated integration strategy

The test imports `processNextAiJob` from the real backend and uses the same durable worker path as production. It validates:

- asynchronous acknowledgement contract;
- durable job creation;
- plain-text provider output;
- server-selected approved image attachment;
- successful general and grounded answers;
- prompt runtime publication and memory reset;
- retry state transitions;
- terminal provider-failure message;
- no human-handoff button while handoff is disabled.

## Provider test double correction

The fake DeepSeek provider previously returned JSON text even though the production request now specifies plain text. It now returns the customer-facing answer directly and recognizes the newline-based `Customer message:` prompt format.

## Deliberately unchanged

No change was made to:

- strict tenant/platform hostname validation;
- `POST /chat` HTTP 202 behavior;
- AI queue implementation;
- worker retry policy;
- WebSocket delivery;
- Human Support behavior;
- database schema or migrations.
