# v1.16.3 — Admin Contract, Chat Flow and Theme Separation Repair

v1.16.3 repairs the platform-scoped Admin contracts used by Menu & Images and
Global Buttons, enforces one unanswered automated question per conversation,
adds ten-message progressive customer history, and separates Guide appearance
from Chat appearance.

Release marker: `1.16.3-admin-contract-chat-flow-theme-separation`

## Production architecture

```text
Admin authentication
      ↓
Stable active platform context
      ↓
Independent feature routes
  ├── Menu & Images
  ├── Global Buttons
  ├── Guide Theme
  └── Chat Theme
```

Menu & Images and Global Buttons no longer use the Customer Service platform
listing as a page dependency. They resolve the active tenant/platform through
the shared Admin platform context, then call their own feature APIs.

## One pending customer question

```text
Customer sends one question
      ↓
Message and durable AI job are saved
      ↓
Composer locks while the job is QUEUED, PROCESSING, or RETRYING
      ↓
Final answer or final failure arrives
      ↓
Composer unlocks
```

The browser lock is backed by a transactional backend check and a PostgreSQL
partial unique index. Duplicate browser tabs and repeated requests cannot create
two active AI jobs for the same conversation. A second legitimate question
receives HTTP `409 CONVERSATION_RESPONSE_PENDING` until the current response
finishes.

## Progressive customer history

Customer Chat restores the newest ten non-internal messages. When older history
exists, the customer can select **Show previous messages** to load the preceding
ten messages using `before_sequence`. Older messages are prepended while the
scroll anchor is preserved.

Realtime catch-up still uses ordered message sequences. Pagination is only for
older history and does not replace live delivery.

## Separate Guide and Chat themes

Migration `041` introduces:

- `guide_theme_settings`
- `chat_theme_settings`

Existing values are copied from the legacy shared theme row without deleting
rollback data. Guide changes do not alter Chat, and Chat changes do not alter
Guide. The customer Chat language dropdown is disabled and removed from the
public interface.

## Global Buttons

Buttons use one platform-wide label and optional subtitle. Legacy localized
columns remain archived for rollback compatibility, but production reads and
writes the global `label` and `subtitle` fields only.

## Database migration

```text
backend-api/migrations/041_v1.16.3_admin_chat_theme_and_queue_guard.sql
```

Do not modify migration `041` after deployment. The next migration is `042`.

## Deployment order

1. Snapshot Neon.
2. Deploy the backend and apply migration `041`.
3. Verify the backend release marker.
4. Deploy Guide.
5. Deploy Chat.
6. Deploy Staff.
7. Deploy Admin.
8. Run the acceptance checklist in `DEPLOYMENT_CHECKLIST_V1.16.3.md`.

## Local installation

Use the versioned repair package installer. It verifies package SHA-256 values,
checks the v1.16.2 baseline, creates a changed-file rollback backup, copies only
reviewed files, verifies installed hashes, and runs source-level regressions.
It never commits, pushes, deploys, accesses secrets, or applies migrations.
