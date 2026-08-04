BDG v1.16.0-r4 — Customer Service Installer Verification Hotfix

This revision supersedes the v1.16.0-r3 repair package.

ROOT CAUSE
The r3 Windows installer used FINDSTR commands containing TypeScript text with CMD metacharacters such as <, >, |, and !. CMD interpreted those characters as redirection, pipe, and delayed-expansion syntax instead of literal search text. The installer therefore appeared frozen at step [4/6].

R4 FIX
- Removes unsafe FINDSTR source-code verification.
- Disables delayed expansion in the installer.
- Verifies installed code through a dedicated PowerShell script.
- Passes the target through a temporary environment variable, avoiding fragile quote and trailing-slash parsing.
- Runs only the fast route regression by default.
- Makes the full Admin typecheck opt-in with BDG_RUN_FULL_TYPECHECK=1.

APPLICATION IMPACT
No backend, database, API, WebSocket, support workflow, or migration change.
Application version remains 1.16.0.
Migration remains 038. Next migration remains 039.

INSTALL
Extract the ZIP and run START-HERE-WINDOWS.bat.
Default target:
C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT

Custom target:
INSTALL-V1.16.0-R4-CUSTOMER-SERVICE-INSTALLER-HOTFIX.cmd "D:\path\to\BDG_CS_ASSISTANT"
