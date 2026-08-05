BDG v1.16.1 - Plain-Text AI Worker and Realtime Delivery Repair
================================================================

BASE VERSION
  v1.16.0-r5

APPLICATION VERSION
  1.16.1

RELEASE MARKER
  1.16.1-plain-text-ai-worker-realtime-delivery

DATABASE
  New immutable migration: 039
  Next migration: 040

MAIN REPAIR
  - DeepSeek returns plain customer-facing text instead of strict model JSON.
  - Customer messages are accepted immediately with HTTP 202.
  - A durable PostgreSQL AI worker processes replies in the background.
  - The temporary processing message is ephemeral and Admin-managed.
  - Final AI and staff messages arrive through WebSocket without refresh.
  - Reconnection requests missed message sequences.
  - Staff takeover cancels or suppresses pending AI work.
  - Staff resolution returns the customer to AI by default.
  - Handoff OFF prevents support recommendations and queue creation.

INSTALLATION
  1. Extract the repair ZIP.
  2. Double-click START-HERE-WINDOWS.bat.
  3. Review the rollback backup and Git changes.
  4. Commit: v1.16.1 Plain-Text AI Worker and Realtime Delivery Repair
  5. Push and follow DEPLOYMENT_CHECKLIST_V1.16.1.md.

The installer does not commit, push, deploy, access production secrets, or
turn Human Support on automatically.
