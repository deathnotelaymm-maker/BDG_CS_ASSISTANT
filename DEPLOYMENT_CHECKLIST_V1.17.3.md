# Deployment Checklist — v1.17.3

1. Take a Neon snapshot.
2. Install/commit v1.17.3 and push.
3. Let GitHub Actions complete, including `test:v1173` and PostgreSQL integration.
4. Deploy backend version 1.17.3.
5. Apply migration 046 exactly once through the normal migration runner.
6. Deploy Staff, Chat, Admin and Guide builds.
7. Verify Luke Staff shared URL without `/p/...` is rejected with the incomplete-workspace experience.
8. Verify a Staff account cannot log into another platform route.
9. Verify an Admin account can log into the correct Support Workspace and Staff cannot log into Admin.
10. Verify Reply vs Internal Note; customer must never receive Internal Note content.
11. Verify customer-left/support-right layout and centered compact system events.
12. Verify all three workspace panels scroll independently and newest messages auto-follow.
13. Verify customer Chat header/status/composer remain visible and menu drawer opens.
14. Verify public support names/avatars and broken-promotion fallback.
15. Verify existing Luke Shared Hosting and verified Custom Domain flows still work.
