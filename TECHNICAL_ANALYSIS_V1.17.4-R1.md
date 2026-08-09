# Technical Analysis — v1.17.4-R1

## Observed failure

The legacy v1.16.1 regression required all of these markers in `staff-pro/src/App.tsx`:

- `Dashboard`
- `conversation-list`
- `context-panel`
- `openStaffConversationStream`
- `api.sync`

They were combined into one boolean expression, so the CI log could only report the umbrella failure `staff console has dashboard, three-panel chat, and realtime sync`.

## Authoritative v1.17.4 state

The final v1.17.4 package contains every required marker. The canonical Staff files also contain the SSE consumer and authenticated Staff/Admin stream routes. Their canonical SHA-256 values are:

- `staff-pro/src/App.tsx`: `bbfb2f4519b3f2f824bda85eb558f45467799a121bf9d12e03305f3c105b4e91`
- `staff-pro/src/api.ts`: `510f67d29061094737b05f6a507a5eda9ca52b33366cb94dfbb1372b660886b6`

R1 re-applies those exact source files rather than weakening the carry-forward test.

## Diagnostic repair

The legacy test now validates each Staff workspace marker separately and then retains the aggregate workspace assertion. A new R1 regression additionally verifies:

- Dashboard / conversation rail / context panel markers.
- `openStaffConversationStream` and `consumeStaffEventStream` usage.
- Authorization on Staff/Admin SSE routes.
- SSE frame parsing using blank-line event boundaries and `event:` / `data:` fields.
- HTTP `after_sequence` catch-up for Staff and Admin.
- Normal and production CI wiring for `test:v1174r1`.

## Database impact

None. Migration `047` remains immutable and current. The next migration remains `048`.

## Deployment impact

R1 installs only over a v1.17.4 tree with migration `047` present. It makes a changed-file rollback backup, copies only reviewed files, verifies SHA-256, and runs dependency-free carry-forward/source-sync checks. It does not run migrations, access production secrets, commit, push, or deploy.
