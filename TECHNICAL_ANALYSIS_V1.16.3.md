# Technical Analysis — v1.16.3

## 404 root cause

Menu & Images and Buttons were coupled to `/admin/support-platforms`, a
Customer Service compatibility route. This made unrelated Admin features fail
when that support-specific endpoint was unavailable or deployed out of sync.
The repair uses the existing stable `/admin/platform-context` contract and
keeps each feature on its own CRUD routes.

## Queue race protection

A frontend-only disabled button cannot prevent multi-tab or retry races. The
backend now checks active jobs while the conversation row is locked and returns
HTTP 409 with `CONVERSATION_RESPONSE_PENDING`. Migration `041` repairs any
pre-existing duplicate active jobs and adds a partial unique index as the final
source-of-truth guard.

## History scalability

Full-history restoration becomes slow and disrupts scroll as conversations
grow. The support service now returns the newest ten visible messages and a
`has_older_messages` flag. Older pages use descending sequence selection and
are returned in ascending display order. The client preserves the pre-insert
scroll height.

## Theme separation

The old `theme_settings` row mixed Guide and Chat concerns. New typed tables
own their respective fields. Public legacy theme output overlays the separated
settings so existing Guide and Chat clients stay compatible during migration.

## Global button contract

The backend normalizes global `label` and `subtitle` values and ignores legacy
localized output fields. The Admin form exposes only the global contract.
