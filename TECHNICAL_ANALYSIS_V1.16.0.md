# Technical Analysis — v1.16.0

## Design decisions

1. `staff-pro` is separate from Admin to reduce privilege exposure and provide a faster live-chat workspace.
2. `admin_users` remains the credential store; `support_staff_profiles` supplies platform scope and support-specific permissions.
3. Human Support is not an AI source. The prompt-first AI only emits a controlled result and optional handoff reason.
4. One unified support timeline stores CUSTOMER, AI, STAFF, and SYSTEM messages.
5. Staff team viewing is read-only unless ownership is transferred.
6. Offline is server-controlled through logout, session revocation, deactivation, or heartbeat expiry.
7. All permanent timestamps remain UTC-backed; IANA timezones are display preferences.

## Backend modules

- `support-auth.js`: signed staff/customer support tokens.
- `support-events.js`: process-local realtime event fan-out.
- `support-realtime.js`: authenticated `/support` WebSocket gateway.
- `support-service.js`: support settings, accounts, queue, assignment, messages, transfers, reports, and audit.

## Database tables

`support_staff_profiles`, `support_staff_permissions`, `support_settings`, `support_conversations`, `support_messages`, `support_assignments`, `support_transfers`, `support_internal_notes`, `support_staff_sessions`, `support_presence_sessions`, `support_activity_events`, and `support_audit_events`.

## AI handoff contract

Allowed hidden result values: `ANSWERED`, `NEEDS_CLARIFICATION`, `HUMAN_RECOMMENDED`, `BLOCKED`, and `PROVIDER_ERROR`. Controlled reasons include customer request, unclear request, clarification limit, account investigation, manual action, outside scope, provider failure, and admin keywords. The server decides whether a button may be displayed.

## Assignment safety

Manual acceptance requires Active presence and remaining capacity. The update requires `WAITING_FOR_AGENT` and `assigned_staff_id IS NULL`; related assignment and system-message inserts execute in one transaction. Transfer requests retain the current owner. Transfer acceptance changes owner, closes the old assignment, creates the new assignment, and writes the system message in one transaction.

## Session revocation

Staff tokens include the account session version and support session ID. Password changes, password resets, deactivation, and force logout invalidate old sessions. The WebSocket receives `support:force_logout` and closes.

## Known production boundary

Realtime fan-out is process-local. This release is approved only for a single backend instance. It is not safe to advertise horizontal WebSocket scaling until a shared backplane is implemented.

## Installer r2 root cause and correction

The original CMD script assigned `%~dp0` to `PACKAGE_ROOT`. `%~dp0` always ends with a backslash. Passing that value as a quoted native argument to `powershell.exe` created an ambiguous terminal `\"` sequence. On the affected Windows environment, the quote became part of the `PackageRoot` string, and `Join-Path` produced a path containing an illegal quote character.

Revision r2 removes that argument boundary entirely: the verifier derives its directory from `$PSScriptRoot`. The CMD script also canonicalizes its own root with `%~dp0.` through a `for` expansion, producing a full path without a trailing separator.
