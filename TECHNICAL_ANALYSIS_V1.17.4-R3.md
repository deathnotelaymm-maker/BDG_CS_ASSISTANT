# v1.17.4-R3 Technical Analysis

## Root cause

GitHub CI successfully installed, typechecked, and built Guide Pro, then failed because `npm audit --audit-level=high` detected newly published advisories in the already-locked dependency graph. The application code itself was not the failing stage.

The affected locked releases were DOMPurify 3.4.12, js-yaml 4.3.0, and nanoid 3.3.16. Because js-yaml and nanoid are transitive frontend-tooling dependencies, fixing Guide alone would leave the same vulnerable lock entries in other frontend applications. R3 therefore repairs all four frontend lockfiles in one release.

## Dependency strategy

R3 uses targeted patch-level resolutions only. It does not use `npm audit fix --force`, does not introduce major dependency upgrades, and does not upgrade Recharts merely to remove a deprecation warning.

DOMPurify is a direct Guide dependency, so its declared minimum is also raised to `^3.4.13`. js-yaml and nanoid remain transitive; their existing parent semver ranges accept the patched releases, so the lockfiles are advanced without adding artificial direct runtime dependencies.

## Release installer repair

The R2 native `.cmd` wrapper supplied `-PackageRoot "%~dp0"`. `%~dp0` ends with a backslash. In the affected Windows argument path this could reach the PowerShell script as malformed quoted text and cause `[IO.Path]::GetFullPath()` to throw `Illegal characters in path`. R3 removes that argument entirely and derives the package root from `$MyInvocation.MyCommand.Path` / `$PSScriptRoot`.
