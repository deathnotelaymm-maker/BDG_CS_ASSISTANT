# Test Result — v1.15.5

## Independently executed in this build environment

### Backend syntax

```text
PASS server.js
PASS core.js
PASS chat-reliability.js
PASS prompt-runtime.js
PASS r2-adapter.js
PASS env.js
PASS rich-html.js
PASS network-safety.js
PASS migration-files.js
```

### Application source regression suite

```text
62/62 passed
```

This includes checks for:

- retired AI navigation removal;
- HTTP 410 backend retirement boundary;
- one-call prompt-first runtime;
- approved Menu & Images-only catalog;
- general answers without approved-source blocking;
- prompt version/hash diagnostics;
- prompt-aware memory reset;
- automatic language detection;
- server-validated media;
- tenant/platform isolation;
- security and deployment contracts.

### Prompt runtime suite

```text
5/5 passed
```

### AI response reliability suite

```text
6/6 passed
```

### Simplified AI production runtime suite

```text
5/5 passed
```

### Changed TypeScript/TSX parser validation

All changed Admin TypeScript and TSX files parsed/transpiled successfully with
TypeScript 5.8.3.

### Workflow validation

Both GitHub Actions YAML files parsed successfully.

## Not independently completed in this container

A full `npm ci`, complete Admin/Chat/Guide typecheck and Vite build, dependency
audit, dependency-based upload/security tests, and PostgreSQL integration suite
were not completed because this container could not reach the npm registry and
did not provide a disposable PostgreSQL service.

The GitHub CI and production workflow are updated to execute:

```text
backend syntax
62 regression checks
prompt runtime checks
simplified AI checks
AI reliability checks
security checks
structured-response checks
upload checks
PostgreSQL integration checks
Admin/Chat/Guide typechecks and builds
npm high-severity audits
```

Production deployment should proceed only after those GitHub jobs pass.
