# Technical Analysis — v1.17.3

## Security first
The highest-priority repair is Staff scope enforcement. On the Luke shared Staff origin, a missing platform route is rejected before normal staff login. A supplied route must resolve to the same tenant/platform as the account. Client-owned Staff hostnames must be verified, active, SSL-active exact mappings. Issued support tokens remain tenant/platform scoped.

## Admin support access
Admin uses its own authentication and Admin support APIs inside the Support Workspace. It is not converted into a Staff identity. Admin replies and notes remain attributable to Admin and do not inflate Staff performance metrics.

## Timeline model
Permanent customer/support messages remain PostgreSQL-backed and SSE-delivered. Internal Notes are persisted separately and exposed only to authorized Staff/Admin views. System lifecycle events are presentation-level status events rather than reply bubbles.

## UX model
The operational desktop workspace uses three independently scrollable regions with sticky header/composer. Customer Chat uses a fixed 100dvh shell with only the timeline scrolling. Incoming messages schedule automatic latest-message following; earlier-history loads preserve the reader anchor.
