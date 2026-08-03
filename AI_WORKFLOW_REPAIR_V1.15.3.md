# v1.15.3 AI workflow repair

## What prevented normal answers

The previous live workflow required two sequential model calls: a semantic
judge followed by a structured composer. Either stage could time out, return an
empty JSON-mode response, reject a valid-looking answer, or exhaust the total
turn deadline. General questions were also converted into no-match fallbacks
when no approved source was selected.

Production configuration still selected `deepseek-chat`. The current DeepSeek
API uses `deepseek-v4-flash` or `deepseek-v4-pro`; v1.15.3 normalizes old model
names at runtime and migration 035 repairs the stored database value.

## New default workflow

1. Deterministic greetings and respectful boundaries remain local.
2. Every other normal question makes one prompt-first provider request.
3. Enabled Prompt Manager sections define role, job, tone, language, output,
   safety, and escalation behavior.
4. Approved tenant/platform sources are included as preferred factual context.
5. The model may select one valid source ID when it directly matches.
6. The server validates that ID and automatically attaches one approved image
   plus approved buttons from that source.
7. If no source matches, the model may answer a general question under the
   configured role when approved-only mode is off.

The old judge-plus-composer workflow remains selectable as
`advanced_two_stage`, but it is no longer the default.

## Failure behavior

Empty JSON-mode provider responses use the bounded retry policy. A malformed
non-JSON plain-text answer can still be delivered safely. When the provider is
unavailable, a conservative exact/near-exact approved-source fallback can return
verified content and its image. General AI answers cannot be generated during a
total provider, API, database, DNS, or browser-network outage.

## Real provider test

Admin → AI Reliability now displays the model settings and calls the real
provider when **Run safety test** is pressed. It reports whether AI is enabled,
the Render API key is present, the model is current, and the provider returned
a valid result. The secret key is never returned to Admin.
