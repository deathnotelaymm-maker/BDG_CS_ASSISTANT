# v1.15.4 technical analysis — Prompt Runtime and Versioning Repair

## Failure pattern

The previous application loaded all enabled prompt rows, but it did not create a
published runtime identity. Chat logs recorded only a section count. Sessions
also kept assistant memory without knowing which prompt produced that memory.
As a result, several different failures looked identical:

- a deleted prompt appeared to remain active because its old replies remained
  in conversation memory;
- Admin and Chat could use different platform scopes without a visible compiled
  runtime to compare;
- section clipping was invisible;
- conflicting or empty sections had no warning;
- a stale deployment could not be distinguished from a stale prompt;
- greetings and help messages bypassed Prompt Manager entirely.

## Architecture decision

v1.15.4 keeps the existing Prompt Manager editing model for backward
compatibility, but introduces a compiled runtime between storage and inference.

```text
Editable prompt rows
        ↓ compilePromptRuntime()
Immutable runtime snapshot
        ↓ atomic active pointer
Prompt-aware chat session
        ↓ one prompt-first provider request
Validated response and approved assets
        ↓
Runtime-aware Chat Log
```

This avoids a disruptive Assistant Profile migration while establishing the
runtime contract needed for a future draft/publish profile system.

## Compiler contract

The compiler:

1. selects enabled sections only;
2. normalizes keys, titles, line endings, and whitespace;
3. sorts by priority, then numeric ID, then normalized key;
4. includes up to 6,000 characters per section;
5. includes up to 24,000 prompt characters in total;
6. records all clipping and validation warnings;
7. stores included section IDs and section hashes;
8. hashes the exact compiled prompt using SHA-256.

The model receives the stored active compiled prompt, not a newly improvised
combination of independent cards.

## Publication contract

Every modifying operation compiles the complete active section set and creates
an immutable version when the hash differs. Manual rebuild intentionally creates
a new version even when the text is unchanged. The active pointer changes in the
same PostgreSQL statement that inserts the version, under a tenant/platform
advisory transaction lock.

## Memory contract

A session may reuse memory only while its stored prompt hash equals the active
runtime hash. When the hash differs:

- `chat_memory_messages` are deleted;
- `memory_summary` is cleared;
- `message_count` is reset;
- the new runtime ID and hash are stored;
- the reset timestamp and reason are recorded.

This also handles pre-v1.15.4 sessions whose previous hash is empty.

## Cache contract

Prompt list, prompt history, prompt runtime preview, prompt writes, restores,
and Admin AI tests return private no-store responses. The server still compiles
current scoped prompt rows before using the active version; a hash mismatch
causes automatic runtime-drift repair.

## Security boundaries

- Runtime rows remain tenant- and platform-scoped.
- The public model response cannot select an arbitrary source or image URL.
- Source IDs are validated against the approved scoped catalog.
- Only approved server-owned images and buttons are attached.
- Prompt hashes and section hashes are diagnostics, not secrets.
- DeepSeek API keys are never returned to Admin or stored in runtime records.
- Customer text and knowledge-source text remain explicitly untrusted data in
  the system instruction.

## Future-compatible path

A later version can add explicit Draft, Published, and Archived Assistant
Profiles on top of the same immutable runtime infrastructure. v1.15.4 focuses
on repairing live reliability without breaking existing Prompt Manager data or
Admin workflows.
