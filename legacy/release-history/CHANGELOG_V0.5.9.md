# v0.5.9 — Guide Detail Route + Premium Reader Fix

## Fixed
- `/guides/$slug` route now opens the actual guide detail page.
- Parent `/guides` route no longer blocks the child detail route.
- Guide detail page layout upgraded for readability.
- Guide body parser improved for Q/A and numbered instructions.
- Hindi/English detail query key now refetches when language changes.

## Not changed
- Worker API remains the current healthy backend.
- Database schema is unchanged.
- Admin and Chat are not redeployed by the safe guide-only script.
