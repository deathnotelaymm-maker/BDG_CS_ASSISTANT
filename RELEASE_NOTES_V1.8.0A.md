# v1.8.0a — AI Q&A approval repair

This hotfix repairs imported drafts created by the first v1.8 build.

## Fix

Some existing import rows already had an `imported_content_id`, but their content row did not carry the new `source_type = 'qa'` marker. The approval request therefore returned `404 AI Q&A item not found`.

When an administrator approves an imported row, the backend now verifies the draft inside the current tenant and platform, repairs the missing Q&A source marker, and publishes it. Cross-tenant and cross-platform records remain rejected.

No data is deleted and no database reset is required.
