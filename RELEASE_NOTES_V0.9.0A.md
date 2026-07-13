# v0.9.0a — Reliable R2 Image Upload + Upload Diagnostics Hotfix

## Fixed

- Replaces unknown-length R2 streaming uploads with a fully sized `Buffer` and explicit S3 `ContentLength`.
- Eliminates `ERR_HTTP_INVALID_HEADER_VALUE` for `x-amz-decoded-content-length`.
- Validates supported image MIME types, filename extensions, empty files, mismatches, and the 10 MB file limit before storage.
- Returns stable upload error codes and safe customer-facing messages.
- Propagates the generated request ID into the internal API request.
- Writes structured Render error logs containing request ID, route, status, error code, cause, and version.
- Admin upload errors now display the stable error code and request ID.

## Scope

- Backend upload endpoints: `/admin/uploads` and `/chat/uploads`.
- Admin image features: AI Prompt & Image, category icons, and Guide editor images.
- No database migration is required.
- Guide and Chat frontend deployments are not required.

## Confirmed production error

`TypeError [ERR_HTTP_INVALID_HEADER_VALUE]: Invalid value "undefined" for header "x-amz-decoded-content-length"`

## Verification

- Existing backend regression checks: 25/25.
- Structured/prompt-first checks: 5/5.
- New R2 upload checks: 4/4.
- Total backend checks: 34/34.
- Admin production build: passed.
