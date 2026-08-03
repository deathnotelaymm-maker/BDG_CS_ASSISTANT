# v1.15.4 — Prompt Runtime and Versioning Repair

## Prompt compiler

- Added a dedicated `prompt-runtime.js` compiler.
- Compiles every enabled Prompt Manager section in stable priority, ID, and key
  order.
- Generates one exact system-instruction runtime per tenant and platform.
- Generates SHA-256 hashes for the compiled prompt and each included section.
- Raises visible warnings for empty sections, missing core sections, duplicate
  priorities, per-section clipping, and total-runtime clipping.
- Increased the explicit runtime allowance to 6,000 characters per section and
  24,000 characters in total.

## Immutable runtime versions

- Added immutable `ai_prompt_runtime_versions` snapshots.
- Added `ai_prompt_runtime_state` as the atomic active-version pointer.
- Every prompt save, update, delete, history restore, and manual rebuild creates
  and activates a runtime version.
- Runtime drift is detected and repaired automatically if stored prompt rows do
  not match the active compiled hash.
- Published runtime records are not edited or deleted by the application.

## Prompt-aware memory

- Chat sessions now record their last prompt runtime ID and hash.
- Existing customer memory is cleared when its hash differs from the active
  runtime.
- Pre-v1.15.4 sessions with memory but no stored hash are cleared on first use.
- Prompt reset timestamp and reason are retained for diagnostics.
- Admin AI tests always use a random fresh session and never reuse public chat
  memory.

## Runtime diagnostics

- Added `GET /admin/ai/prompt-runtime` with `no-store` response headers.
- Added `POST /admin/ai/prompt-runtime/rebuild`.
- Prompt Manager displays platform, route, active version, hash, character
  count, compiler warnings, exact compiled prompt, and recent runtime history.
- Chat Logs display prompt version, hash, section IDs, prompt size, and memory
  reset reason for each answer.
- AI Diagnostics displays the active runtime and fresh-test metadata.

## Conversation routing

- Normal greetings, thanks, help requests, and general questions now use the
  active Prompt Manager runtime.
- Only hard respectful-boundary messages bypass DeepSeek through the local
  safety layer.
- The one-call prompt-first workflow, approved-source validation, approved image
  attachment, bounded retries, and safe outage fallback remain unchanged.

## Database

- Added immutable migration
  `036_v1.15.4_prompt_runtime_versioning_repair.sql`.
- Added prompt runtime and memory-reset fields to `chat_sessions` and
  `chat_logs`.

## Tests

- Added 5 dedicated prompt-runtime compiler checks.
- Expanded source regression coverage from 56 to 62 checks.
- Extended the PostgreSQL/API integration runner to verify runtime tables,
  no-store preview, multi-section compilation, runtime hash changes, prompt-
  managed greetings, and old-memory reset after a prompt update.
