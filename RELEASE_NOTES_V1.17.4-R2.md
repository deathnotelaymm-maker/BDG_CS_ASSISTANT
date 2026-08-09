# Release Notes — v1.17.4-R2

## Regression Contract Stabilization

This is a CI/test-contract hotfix on top of v1.17.4-R1.

### Fixed

- Updated the Human Support foundation test to use the current `Luke CS Workspace` identity instead of the obsolete `Luke Support Workspace` title.
- Split the old combined Staff-console assertion into independent checks for:
  - current CS Workspace identity;
  - Team queue availability;
  - Staff and Administrator login modes.
- Added a dedicated R2 guard that audits the support-facing regression contracts and prevents the obsolete positive workspace-title assertion from returning.
- Added `test:v1174r2` to normal GitHub CI and production-release CI.

### Unchanged

- Application version remains `1.17.4`.
- Runtime release marker remains `1.17.4-cs-identity-domain-promotion-menu-upgrade`.
- Migration `047` is unchanged.
- Next migration remains `048`.
- No Customer Chat, Staff Workspace, Admin, AI runtime, domain-mapping, profile, menu, or promotion feature behavior is changed by R2.
