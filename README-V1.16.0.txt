BDG CS ASSISTANT v1.16.0
Human Support & Live Chat Foundation

PACKAGE REVISION R2
===================
This archive supersedes the original v1.16.0 repair ZIP. It fixes the Windows
installer path-quoting failure that produced: Test-Path: Illegal characters in path.
Application behavior, migration 038, and the release marker are unchanged.

START HERE
==========
1. Back up the production Neon database.
2. Extract the repair ZIP.
3. Run START-HERE-WINDOWS.bat.
4. Review the copied files in GitHub Desktop.
5. Commit: v1.16.0 Human Support & Live Chat Foundation
6. Push to main.
7. Follow DEPLOYMENT_CHECKLIST_V1.16.0.md exactly.

WHAT THIS RELEASE ADDS
======================
- A separate staff-pro Customer Service Console.
- Platform-scoped customer-service staff accounts.
- Active, Invisible, and system-controlled Offline presence.
- Authenticated /support WebSocket gateway.
- 30-second heartbeats and 90-second offline timeout defaults.
- Waiting queue and atomic manual acceptance.
- One assigned staff owner; team conversations are read-only.
- Safe transfer request, accept, and reject workflow.
- Unified AI, customer, staff, and system message timeline.
- AI-to-human handoff controls inside Assistant Setup.
- Admin Customer Service center, performance, settings, and audit history.
- Force logout, password reset, account activation, UTC storage, and timezone display.
- Migration 038.

PRODUCTION LIMIT
================
v1.16.0 uses an in-process realtime event bus. Run exactly one Render backend instance. Horizontal scaling requires a shared Redis/PostgreSQL event backplane in a later release. Permanent messages and assignments are stored in PostgreSQL.

SAFE DEFAULT
============
Migration 038 creates Human Support with human_support_enabled = false. Complete acceptance testing before enabling it for a real platform.
