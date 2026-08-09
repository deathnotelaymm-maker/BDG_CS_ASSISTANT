# v1.17.4-R3 — Frontend Dependency Security Repair

Base: v1.17.4-R2  
Application version: 1.17.4  
Database migration: unchanged (`047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql`)  
Next migration: 048

## Purpose

This is a focused dependency-security and release-installer repair. It does not change Customer Service product behavior or database schema.

## Security dependency repair

The frontend lockfiles are moved to the patched versions required by the current GitHub advisories:

- Guide `dompurify`: `3.4.12` → `3.4.13`.
- Admin, Chat, Guide, Staff `js-yaml`: `4.3.0` → `4.3.1`.
- Admin, Chat, Guide, Staff `nanoid`: `3.3.16` → `3.3.17`.

Guide's direct DOMPurify dependency floor is raised to `^3.4.13` so a future lock regeneration cannot validly fall back to the vulnerable release.

## CI guard

`npm run test:v1174r3` validates the patched versions in every frontend lockfile and rejects the vulnerable tarball versions. The guard is wired into normal CI and the production-release workflow.

## Windows launcher repair

R2's Windows `.cmd` wrapper passed a quoted `PackageRoot` ending in `\`, which could become an illegal path before PowerShell `GetFullPath()`. R3 no longer passes `PackageRoot`; the PowerShell installer resolves its directory from its own script path. `START-HERE-WINDOWS.bat` now always displays SUCCESS/FAILURE and pauses before closing.

## Unchanged

- No migration is added or edited.
- Migration 047 remains current.
- No AI, Chat, Staff, Admin, domain, profile, promotion, or support-workflow feature is changed.
