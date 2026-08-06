# Technical Analysis — v1.17.0-r2

## Observed path

`D:\C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT\backend-api\src\core.js`

## Why it occurred

`URL.pathname` is not a native Windows filesystem path. It retains a leading slash before the drive letter. Passing that value to `path.resolve()` while the process is on another drive can create an invalid compound drive path.

## Correct contract

ES modules must convert file URLs with `fileURLToPath(import.meta.url)`. The result is a native absolute path on Windows, Linux, and macOS and is independent of the caller's current working directory.

## Scope

Only the dependency-free regression bootstrap and release tooling changed. The already copied v1.17.0 application files are valid and do not need to be rolled back.
