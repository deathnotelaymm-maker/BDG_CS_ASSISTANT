# v1.17.0-r2 — Windows Regression Path Hotfix

This package supersedes the original v1.17.0 repair package for Windows installation.

## Root cause

The dependency-free v1.17.0 regression script converted `import.meta.url` with `new URL(...).pathname`. On Windows that produces a URL-style path such as `/C:/Users/...`. When the installer was launched from drive D:, Node resolved it as `D:\C:\Users\...`, causing `ENOENT`.

## Repair

The script now uses Node's supported cross-platform conversion:

```js
import { fileURLToPath } from 'node:url';
const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), '../..');
```

The installer also runs the regression from the target repository directory. Application behavior, APIs, migration 043, database schema, and production features are unchanged.
