# BDG v1.16.0-r5 — Customer Service Installed-State Verifier Hotfix

## Fixed

The r4 installer copied the Customer Service route repair successfully but
then reported a false failure because its verifier searched for the literal
marker `Array.isArray(detail.messages)`. The installed route safely normalizes
`value.messages` before storing the detail object, so that exact marker does
not exist.

Revision r5 replaces source-text marker checks with exact SHA-256 comparisons
between the installed critical files and the already checksum-verified payload.

## Unchanged

- Application version: `1.16.0`
- Release marker: `1.16.0-human-support-live-chat-foundation`
- Database migration: `038`
- Backend API and WebSocket protocol
- Customer Service route runtime repair
- Staff Console and support data model

## Supersedes

`BDG-v1160-customer-service-installer-verification-hotfix-r4.zip`
