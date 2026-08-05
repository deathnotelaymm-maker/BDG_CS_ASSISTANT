# Deployment Checklist — v1.16.2-r2

1. Apply this r2 hotfix to the repository containing backend version `1.16.2` and migration `040`.
2. Review the two changed backend test files in GitHub Desktop.
3. Commit with: `v1.16.2-r2 Fix plain-text provider integration contract`.
4. Push to the production branch.
5. Confirm **Check backend source** completes `test:integration`.
6. Confirm the intentional `PLATFORM_CONTEXT_MISMATCH` security request still returns HTTP 400 and the suite continues.
7. Confirm the Indonesian greeting is saved as plain text containing `Halo`, not legacy composer JSON.
8. Confirm the approved Menu & Images test still returns `Jawaban terverifikasi` and attaches the approved image once.
9. No migration or Render environment change is required.
