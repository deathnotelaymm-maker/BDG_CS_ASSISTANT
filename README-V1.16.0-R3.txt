BDG CS ASSISTANT v1.16.0-r3
Admin Customer Service Route Crash Hotfix

This package fixes the production Admin crash at:
/admin/customer-service

ROOT CAUSE
==========
The hidden Support Conversation drawer rendered its children while no
conversation was selected. The page then evaluated detail.conversation.status
while detail was null, causing the TanStack Router error boundary to display:
"Something went wrong!"

WHAT R3 CHANGES
===============
- Makes the conversation-detail state explicitly nullable.
- Renders detail-dependent Drawer content only when a conversation exists.
- Validates and normalizes conversation API responses before rendering.
- Adds a dedicated route regression test.
- Runs that regression test in CI and the production release workflow.

WHAT R3 DOES NOT CHANGE
=======================
- Application version remains 1.16.0.
- Release marker remains 1.16.0-human-support-live-chat-foundation.
- Migration 038 is unchanged.
- Backend support behavior, staff console, and WebSocket protocol are unchanged.

INSTALL
=======
1. Extract the r3 repair ZIP.
2. Run START-HERE-WINDOWS.bat.
3. Review the Git diff.
4. Commit: v1.16.0-r3 Fix Customer Service route crash
5. Push to main and let the production workflow redeploy Admin.
