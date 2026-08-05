# v1.16.1-r3 — Async Integration Contract Hotfix

## Problem

The v1.16.1 production API correctly changed `POST /chat` from a synchronous response to an asynchronous durable-job acknowledgement:

- HTTP status: `202 Accepted`
- `accepted: true`
- `mode: AI_PROCESSING`
- durable `ai_job`

The PostgreSQL integration suite still expected the pre-v1.16.1 synchronous HTTP `200` response and attempted to read the final AI reply directly from that acknowledgement. GitHub Actions therefore failed even though the API returned the intended v1.16.1 contract.

## Repair

The integration suite now:

1. Accepts the initial HTTP `202` acknowledgement.
2. Verifies the queued durable AI job.
3. Executes the exported background worker in the integration environment.
4. Waits for the job to reach a terminal state.
5. Verifies the saved AI message and metadata in PostgreSQL.
6. Verifies prompt runtime hashes and prompt-aware memory reset from `chat_logs`.
7. Uses plain-text fake provider responses instead of legacy model JSON.
8. Tests all three durable provider retry attempts and the safe final failure message.
9. Confirms handoff remains absent when Human Support is disabled.

## Security note

The logged `PLATFORM_CONTEXT_MISMATCH` HTTP 400 remains intentional. It is the expected result of the cross-hostname protection test and was not weakened or removed.

## Compatibility

- Application version remains `1.16.1`.
- Release marker remains `1.16.1-plain-text-ai-worker-realtime-delivery`.
- Migration `039` remains unchanged.
- Next migration remains `040`.
