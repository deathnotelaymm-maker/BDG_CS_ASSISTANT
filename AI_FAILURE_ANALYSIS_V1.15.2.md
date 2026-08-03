# AI failure analysis — v1.15.2

## Evidence from the supplied production log and screenshot

The relevant `POST /chat` requests reached Render and returned HTTP 200. Their
durations were commonly about 5–13 seconds. The screenshot's red “connecting to
server” card was therefore usually an application fallback rendered as an error,
not a failed browser connection.

The screenshot shows three separate paths:

| Customer input | Observed behavior | Likely old path |
|---|---|---|
| `lol` | Natural English reply | judge + composer succeeded, but locale was not honored |
| rude laughter phrase | awkward clarification card | judge returned clarify/no-match and Chat rendered it as an error-style block |
| profanity | server/internet error card | judge or composer failed and legacy provider-error copy was returned |

## Confirmed logic problems

| Problem | Production effect | v1.15.2 repair |
|---|---|---|
| Two provider calls for nearly every message | Failure probability and latency compound | Social/no-match/clarify turns skip the composer; verified content survives composer failure |
| Admin retry/timeout settings were ignored | “Maximum retries” did not change live behavior | Both model stages use the saved policy within a 20-second turn deadline |
| Up to 60 large records in the judge prompt | Slow, oversized, or timed-out provider calls | 40-record and 52,000-character budget with truncation diagnostics |
| Source order was not used to order the assembled catalog | Hard-coded source append order could beat Admin policy | Catalog is sorted by configured source order, locale rank, priority, and ID |
| Indonesian did not see English default-locale sources | Empty/weak catalog and frequent no-match | Exact/base locale, then current platform default; tenant/platform filters remain strict |
| No-match/provider failure used an `error` block | Red card implied infrastructure failure | Localized notice plus optional handoff button |
| Legacy copy blamed customer internet | Misdiagnosis and poor trust | Migration clears known copy; runtime rejects it during rolling deploys |
| Public response exposed provider detail | Unnecessary information disclosure | Public enum fields only; protected logs keep operational detail |
| Empty-expectation quality cases passed degraded output | “98% failed” could be hidden by green tests | Degraded quality runs fail explicitly |

## Production settings to verify after deployment

1. In **AI Model Settings**, confirm enabled, `deepseek-chat`, and the expected
   API base. Confirm Render has `DEEPSEEK_API_KEY`; never paste it into Admin,
   logs, Git, or Chat.
2. In **AI Reliability Policy**, start with 2 retries and 12,000 ms. Configure a
   real HTTPS handoff URL. Avoid English custom fallback text for multilingual
   platforms because those fields are not locale-keyed.
3. In **Locale Registry**, keep the real platform default locale first and only
   enable customer locales that Chat should expose.
4. In **AI Source Router**, use exact/base then platform default until each
   enabled locale has complete published content.
5. In each content studio, verify records are both published and approved and
   belong to the correct tenant/platform. Drafts intentionally never route.
6. Inspect `ai_chat_completed` logs. Watch `response_status`, `resolution_path`,
   `provider_attempts`, `catalog_truncated`, `judge_prompt_characters`, and
   `latency_ms`.

## Recommended reliability targets

- HTTP/API availability: at least 99.9%.
- Customer-usable responses (`success` plus safe `degraded`): at least 99.9%
  while Render and Neon are reachable.
- Grounded model success: at least 95% for known published test questions.
- P95 Chat latency: below 15 seconds; local-conversation P95 below 1 second.
- `no_verified_match`: reviewed weekly and converted into approved content when
  the question is legitimate and repeated.
- `catalog_truncated`: acceptable occasionally; consistently high values mean
  the platform needs content consolidation or a retrieval/indexing phase in a
  future release.

## Suggested next architecture upgrade

For a future v1.16, replace the “send a broad catalog to the judge” design with
a tenant/platform-scoped retrieval index. Retrieve a small semantic top-K set,
then perform one grounded generation call. Keep the deterministic local layer
and approved-source fallback introduced here. This would reduce cost and latency
further, but it requires an indexed retrieval design and migration rather than a
risky last-minute change to v1.15.2.
