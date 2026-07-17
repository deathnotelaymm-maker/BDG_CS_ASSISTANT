# v1.6.0 verification

Executed from the release root:

```text
npm --prefix backend-api run check
npm --prefix backend-api run test:regression
npm run build:all
git diff --check
```

Results:

- Backend syntax check: PASS
- Regression suite: PASS (78/78 legacy and tenant checks)
- Structured response checks: PASS (4/4)
- Upload checks: PASS (4/4)
- Knowledge workbook checks: PASS
- Operations connector checks: PASS (8/8)
- Tenant experience checks: PASS (9/9)
- v1.6.0 checks: PASS (4/4)
- Admin production build: PASS
- Chat production build: PASS
- Guide production build: PASS
- Whitespace check: PASS

The Vite chunk-size notice is a performance warning, not a build failure. No
GitHub push or production deployment is performed by these checks.
