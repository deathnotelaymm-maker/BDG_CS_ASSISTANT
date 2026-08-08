# Technical Analysis — v1.17.1-r2

## Failure

The full application and integration regression stack completed successfully. The job exited at the final npm security audit because the backend lockfile contained `nanoid 3.3.16`, pulled transitively by `postcss` through `sanitize-html`.

## Security advisory

GitHub advisory `GHSA-2v37-7h3g-55p8` marks Nano ID versions below `3.3.17` as affected by a high-severity denial-of-service issue in zero-size custom generators. `3.3.17` is the patched 3.x release.

## Repair

- Preserve `sanitize-html` and `postcss`; no functional dependency upgrade is needed.
- Pin `nanoid` to `3.3.17` using npm `overrides`.
- Resolve the lockfile to `nanoid-3.3.17.tgz`.
- Preserve its registry SHA-512 integrity.
- Add a source regression for version, tarball, integrity, and override contracts.

This is intentionally a dependency-only hotfix.
