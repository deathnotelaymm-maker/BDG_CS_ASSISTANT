# Test Result — v1.17.0-r2

Executed in the packaging environment:

- Patched JavaScript syntax check: passed
- v1.17.0 professional workspace regression: 30/30 passed
- Regression launched outside the repository working directory: passed
- Main application regression: 62/62 passed
- Human Support regression: 24/24 passed
- v1.16.4 SSE regression: 16/16 passed
- Payload SHA-256 verification: passed
- Payload versus complete source: identical
- Repair ZIP integrity: passed
- Complete-source ZIP integrity: passed

Windows PowerShell itself is unavailable in this Linux environment, but the unsupported URL-path conversion that produced `D:\C:\...` has been removed.
