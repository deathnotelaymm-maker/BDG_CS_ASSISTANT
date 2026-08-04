# v1.16.0 — Human Support & Live Chat Foundation

## Release marker

`1.16.0-human-support-live-chat-foundation`

## Packaging revision r2

This package supersedes the original v1.16.0 repair archive. The original Windows installer passed a quoted package directory ending in a backslash to `powershell.exe`; Windows could preserve the closing quote as part of the argument, causing `Test-Path` to fail with `Illegal characters in path`.

The r2 installer normalizes `%~dp0` without a trailing backslash and lets the verifier use `$PSScriptRoot` directly. No application runtime, API, database, or migration behavior changed.

## Summary

This major feature release adds a dedicated customer-service application and a platform-scoped live support backend while preserving the simplified prompt-first AI architecture. Human Support is an escalation destination, never an AI content source or router.

## Applications

- `admin-pro`: Customer Service administration, staff accounts, settings, performance, audit, and conversation oversight.
- `chat-pro`: AI handoff action and customer-side live support continuation.
- `guide-pro`: unchanged feature scope, version-aligned.
- `staff-pro`: new independent Customer Service Console.
- `backend-api`: authentication, queue, conversations, WebSocket gateway, presence, transfers, reports, and audit.

## Human Support workflow

`AI_ACTIVE → HANDOFF_OFFERED → WAITING_FOR_AGENT → AGENT_ACTIVE → RESOLVED → CLOSED`

When the customer accepts a handoff, the existing AI history is copied into one immutable support timeline. AI automatic replies pause while the support conversation is waiting, assigned, or agent-active.

## Staff capabilities

Staff can sign in to the dedicated console, choose Active or Invisible, accept waiting conversations, reply only to their assigned conversations, view permitted team conversations read-only, add internal notes, transfer safely, resolve conversations, view personal performance, select a permitted timezone, and change their own password.

## Admin capabilities

Platform administrators can create and activate/deactivate staff, set temporary passwords, force logout, assign or resolve conversations, configure handoff messages and triggers, configure timezone and presence defaults, view performance, and review immutable support audits.

## Security

- Shared credential foundation with the separate `support_staff` role.
- Admin login explicitly rejects support staff.
- Every support query is tenant and platform scoped.
- Customer and staff WebSocket tokens are signed and time limited.
- WebSocket subscriptions re-check conversation access.
- Assignment and transfer acceptance are executed in database transactions.
- Sent messages are immutable; corrections are new messages.
- Force logout increments session version and disconnects sockets.
- Staff deactivation and heartbeat expiry safely release assigned work according to policy.

## Database

Migration: `038_v1.16.0_human_support_live_chat_foundation.sql`

Never edit migration 038 after deployment. The next migration number is 039.

## Deployment limit

The v1.16.0 realtime event bus is process-local. Production must use one Render backend instance. PostgreSQL remains the permanent source of truth. Add a shared event backplane before horizontal backend scaling.
