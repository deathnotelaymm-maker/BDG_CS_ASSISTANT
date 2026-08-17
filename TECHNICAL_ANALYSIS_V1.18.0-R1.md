# Technical Analysis — v1.18.0-R1 Nano ID Security Hotfix

The CI audit reported Nano ID versions below `3.3.18` as affected by GHSA-2v37-7h3g-55p8. The existing v1.17.1-R2 and v1.17.4-R3 regression contracts intentionally pinned `3.3.17`, so simply editing one lockfile would both leave other workspaces exposed and cause the historical security guards to fail.

R1 makes the dependency policy coherent across the monorepo: every npm workspace has an explicit root override for `nanoid: 3.3.18`, every lockfile resolves the same official registry artifact, the historical guards are advanced to the new security floor, and a new v1.18.0-R1 guard prevents 3.3.16/3.3.17 from reappearing.

The hotfix does not modify runtime application logic and introduces no SQL migration.
