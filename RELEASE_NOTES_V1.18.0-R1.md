# Luke CS v1.18.0-R1 — Nano ID Dependency Security Hotfix

This hotfix keeps application version `1.18.0` and the Commerce Connector v2 feature set unchanged. It responds to the current high-severity Nano ID audit finding by pinning Nano ID 3.x to `3.3.18` across all five npm workspaces.

## Changes

- Backend `overrides.nanoid`: `3.3.17` → `3.3.18`.
- Admin Pro, Chat Pro, Guide Pro and Staff Pro now carry the same deterministic `nanoid: 3.3.18` override.
- All five lockfiles resolve the official `nanoid-3.3.18.tgz` package with its SHA-512 integrity.
- Legacy dependency-security regression contracts now require the new patched floor.
- New v1.18.0-R1 regression guard checks all five package/lock pairs and both CI workflows.
- Normal CI and production release CI execute the new guard before audit/deployment.

## Unchanged

- No database migration. Migration 048 remains latest.
- No Commerce Connector behavior changes.
- No API, Admin, Chat, Guide or Staff UI behavior changes.
- Application/package version remains `1.18.0`; `R1` is the security-repair label.
