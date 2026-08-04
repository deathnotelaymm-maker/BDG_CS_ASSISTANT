# Technical Analysis — v1.16.0-r5

## Observed failure

The r4 installer stopped after copying files and displayed:

```text
Installed route repair marker was not found: Array.isArray(detail.messages)
```

## Root cause

The route implementation performs normalization in `getConversationDetail`:

```ts
messages: Array.isArray(value.messages) ? value.messages : []
```

The drawer then safely maps `detail.messages`. Therefore the r4 verifier's
literal marker did not match the actual implementation. This was a verifier
contract error, not a route failure.

## Repair

`VERIFY-V1.16.0-R5-INSTALLED.ps1` now:

1. Resolves and normalizes the target repository path.
2. Locates the verified package payload using `$PSScriptRoot`.
3. Checks that each critical packaged and installed file exists.
4. Computes SHA-256 for both copies.
5. Fails only when the installed file differs from the reviewed payload.
6. Does not parse TypeScript source text.

This approach is stable across formatting and implementation details while
still proving that the reviewed files were installed exactly.
