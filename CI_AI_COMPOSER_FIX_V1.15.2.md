# v1.15.2 CI fake-provider composer repair

## Failure

The real PostgreSQL/API integration suite expected the Indonesian grounded AI
turn to return `response_status=success`, but received a safe verified-source
fallback with `degraded_reason=composer_invalid_response`.

## Root cause

The integration fake provider classified any system prompt containing the text
`AI Meaning Judge` as a judge request. The real composer prompt intentionally
contains a section named `AI Meaning Judge decision`, so the fake provider sent
the judge JSON contract to the composer. Production composer validation rejected
that wrong contract and correctly returned approved source content as a degraded
fallback.

## Repair

The fake provider now recognizes the dedicated judge request only when the
system prompt starts with `You are the AI Meaning Judge`. Composer prompts
therefore receive the valid `{reply, blocks}` contract. A source regression
assertion prevents the broad substring classifier from returning.

No production AI routing or fallback behavior was weakened, and no CI skip was
added. The logged `PLATFORM_CONTEXT_MISMATCH` remains the suite's intentional
negative hostname-security test and is expected.
