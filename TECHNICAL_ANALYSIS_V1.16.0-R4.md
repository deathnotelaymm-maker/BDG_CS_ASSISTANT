# Technical Analysis — v1.16.0-r4

## Observed failure

All launchers stopped after printing:

```text
[4/6] Verifying the null-state repair...
```

Steps 1 through 3 had already completed, so checksums, backup creation, and file copying were successful.

## Exact defect

The r3 installer contained source-code checks similar to:

```cmd
findstr /C:"useState<SupportConversationDetail|null>(null)" ...
findstr /C:"open={!!detail} ... > ... < ..." ...
```

CMD treats `<`, `>`, and `|` as shell operators and delayed expansion treats `!` specially. Quoting does not make this a safe mechanism for validating arbitrary TypeScript source.

## Correct architecture

R4 uses two narrowly scoped PowerShell verifiers:

1. `VERIFY-V1.16.0-R4-PAYLOAD.ps1` validates immutable SHA-256 package contents.
2. `VERIFY-V1.16.0-R4-INSTALLED.ps1` reads the installed TSX file with `Get-Content -Raw` and performs literal `.Contains()` checks.

No arbitrary project code is executed by either verifier.

## Recovery state

Because r3 froze after the copy step, the route fix may already be present in the repository. R4 is idempotent: it creates a new backup, recopies the reviewed payload, verifies the final state, and completes normally.
