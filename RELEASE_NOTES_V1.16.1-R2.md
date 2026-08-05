# v1.16.1-r2 — Windows Verifier Bootstrap Hotfix

This revision supersedes the original v1.16.1 repair archive.

## Root cause

The original verifier declared `PackageRoot = $PSScriptRoot` in the parameter
block. On the affected Windows invocation this evaluated to an empty string,
so PowerShell reached `Test-Path -LiteralPath` with no usable path.

## Repair

- Pass the normalized package root explicitly from CMD to PowerShell.
- Add a self-location fallback based on `$PSScriptRoot` and
  `$MyInvocation.MyCommand.Path` inside both verifiers.
- Reject empty paths before calling filesystem commands.
- Preserve the full v1.16.1 application payload and migration 039.

No application, API, database, WebSocket, queue, or AI behavior changed.
