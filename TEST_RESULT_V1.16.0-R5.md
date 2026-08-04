# Test Result — v1.16.0-r5

## Passed

- Package SHA-256 verification
- Critical installed-file hash verifier static review
- Customer Service route regression test: 4/4
- Human Support foundation tests: 24/24
- Main application regressions: 62/62
- Prompt Runtime tests: 5/5
- Simplified AI tests: 5/5
- AI reliability tests: 6/6
- Repair payload versus complete source: identical
- ZIP integrity verification
- Secret and generated-directory exclusion review

## Environment limitation

The Windows `.cmd` and Windows PowerShell 5.1 launch path cannot be executed
inside this Linux build container. The r5 verifier avoids source markers and
uses only PowerShell 5.1-compatible `Get-FileHash`, `Test-Path`, and path APIs.
