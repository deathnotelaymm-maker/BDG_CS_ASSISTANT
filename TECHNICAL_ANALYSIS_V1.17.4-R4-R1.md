# Technical Analysis — v1.17.4-R4-R1

## Failure

The v1.17.4-R4 installer passed payload SHA-256 verification and then failed at target verification on Windows PowerShell 5.1.

## Root cause

`VERIFY-V1.17.4-R4-TARGET.ps1` used `ConvertFrom-Json` on npm `package-lock.json` v3. The lockfile `packages` object contains an empty-string root key (`""`), which Windows PowerShell 5.1 cannot reliably materialize as a PSObject property.

## Repair

The target verifier no longer deserializes the whole npm lockfile. It reads the raw JSON and extracts the exact locked `version` for the requested `node_modules/<package>` entry. It still enforces the R3 security baseline:

- `js-yaml` 4.3.1 in Admin, Chat, Guide, Staff.
- `nanoid` 3.3.17 in Admin, Chat, Guide, Staff.
- `dompurify` 3.4.13 in Guide.

The CMD launcher does not pass `PackageRoot`; the PowerShell installer resolves its own directory, avoiding the prior trailing-backslash quoting failure.

## Safety

- Migration 047 is immutable and remains current.
- No database commands are executed.
- Changed files are backed up before copying.
- Payload and installed files are SHA-256 verified.
- R4/R3/R2 and Customer Service source regressions run when Node.js is available.
