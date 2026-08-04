# Technical Analysis — v1.15.5

## Original failure mode

The intended assistant behavior was simple, but the runtime had multiple
possible authorities:

- Prompt Manager
- AI Prompt & Image
- AI Q&A
- imported knowledge
- FAQ and Guide content
- configurable Source Router
- locale routing
- approved-source enforcement
- response-quality processing
- advanced judge/composer stages
- old conversation memory
- local hard-coded replies

A correct prompt could therefore be loaded while the customer still received an
old verified-information fallback or a response selected by another subsystem.

## Production architecture decision

The production path is fixed to:

```text
one active compiled Assistant Setup runtime
+ one tenant/platform-scoped Menu & Images catalog
+ one DeepSeek call
+ server-side source and media validation
```

This architecture is easier to test because every response has only four
possible causes:

1. active Assistant Setup runtime;
2. an approved Menu & Images item;
3. compatible conversation memory;
4. a deterministic hard safety boundary.

## Runtime enforcement

### Fixed policy

`simplifiedAiRuntimePolicy()` returns an immutable contract:

```text
runtime_mode: assistant_profile_menu_image
source_order: [prompt_image]
enabled_sources: [prompt_image]
published_only: true
approved_ai_content_only: true
general_prompt_answers_allowed: true
```

### Candidate query

`buildPromptImageCatalog()` queries only:

```sql
source_type='prompt_image'
AND status='published'
AND approval_status='approved'
AND deleted_at IS NULL
AND tenant_id=<active tenant>
AND platform_id=<active platform>
```

Locale filtering allows the detected/requested locale, the platform default,
and language-neutral items.

### One-call response

`promptFirstAiResponse()` sends:

- the exact compiled Assistant Setup runtime;
- a bounded approved Menu & Images catalog;
- the customer message;
- compatible recent memory;
- one strict JSON response contract.

The returned `item_id` is accepted only when it exists in the exact candidate
array. The server, not the model, decides which image and button URLs may be
returned.

## Language handling

`inferChatLocale()` uses an explicit supported locale unless the value is
`auto`, `automatic`, `detect`, or `all`. Otherwise it detects common Unicode
scripts, including Burmese, before using the platform default locale.

This prevents a Burmese message from inheriting an English default solely
because the Admin test did not send a language field.

## Retired backend boundary

`retiredAiAdminEndpoint()` intercepts old AI module routes before their former
handlers. It returns:

```json
{
  "ok": false,
  "code": "AI_MODULE_RETIRED",
  "replacement": "<supported route>",
  "version": "1.15.5-simplified-ai-production-runtime"
}
```

with HTTP 410.

The live runtime does not call the old router, Q&A, knowledge import, locale
studio, response-quality, judge, or composer paths.

## Why historical data is retained

Immediately dropping tables would make rollback destructive and could erase
customer-authored content. v1.15.5 therefore uses staged retirement:

1. remove navigation;
2. redirect old pages;
3. reject backend endpoints;
4. remove old sources from live queries;
5. archive Q&A records;
6. retain tables for rollback/audit;
7. observe production;
8. optionally remove dead storage in a later migration.

This is the safer production interpretation of “remove from backend”: no live
request can execute the old functionality, while rollback remains possible.

## Security impact

Positive changes:

- smaller live AI attack surface;
- fewer content types can enter a model prompt;
- drafts and unapproved records are excluded by SQL;
- no client can reactivate retired modules through old endpoints;
- source IDs and media remain server validated;
- model instructions have one administrative authority;
- provider errors remain customer-safe;
- tenant/platform isolation remains enforced.

Residual historical code and tables are not reachable through production routes.
They should be considered for physical deletion only after the rollback window.

## Production limitations

- A live DeepSeek key and quota are still required for general answers.
- Menu facts must be created and approved in Menu & Images.
- The AI cannot know real prices or availability from Assistant Setup alone.
- Provider outages still use the configured safe fallback/handoff path.
- Full dependency builds and PostgreSQL integration require CI or a local
  environment with npm registry and a disposable PostgreSQL database.
