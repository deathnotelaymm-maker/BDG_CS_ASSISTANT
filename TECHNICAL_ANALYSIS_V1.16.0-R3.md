# Technical Analysis — v1.16.0-r3

## Production symptom

TanStack Router displayed its route error boundary immediately after navigating
to `/admin/customer-service`. The page did not reach a usable loading state.

## Root cause

`detail` was initialized with `useState<any>(null)`. The Drawer component was
closed with `open={!!detail}`, but React still rendered its child tree. One child
computed the button label using `detail.conversation.status` without a null
guard. A closed Drawer does not prevent child evaluation.

Using `any` prevented strict TypeScript from detecting the null dereference.

## Repair

1. Define `SupportConversationDetail` and store it as
   `SupportConversationDetail | null`.
2. Render Drawer contents only when `detail` is non-null.
3. Normalize API response messages to an array.
4. Reject malformed conversation responses before updating state.
5. Add a regression test that asserts the nullable state and guarded Drawer
   boundary remain present.
6. Run the regression test in both generic CI and the production release job.

## Production impact

The repair is frontend-only. It does not alter API contracts, support records,
WebSocket events, authentication, permissions, or migration 038.
