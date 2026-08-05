# Deployment Checklist — v1.16.1-r3

1. Apply the r3 hotfix to the repository containing backend version `1.16.1` and migration `039`.
2. Review the single changed test implementation in GitHub Desktop.
3. Commit with: `v1.16.1-r3 Fix asynchronous integration contract`.
4. Push to the production branch.
5. Confirm `Check backend source` completes the full PostgreSQL integration suite.
6. Confirm the expected hostname-mismatch test returns HTTP 400 and does not fail the suite.
7. Confirm the chat integration test accepts HTTP 202, processes the durable job, and verifies the final saved message.
8. No Render or Cloudflare redeployment is required for runtime behavior because application code did not change; allow the normal workflow to complete consistently.
