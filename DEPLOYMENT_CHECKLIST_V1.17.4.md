# Deployment Checklist — v1.17.4

1. Take a Neon snapshot/backup before migration.
2. Review the repair payload and commit v1.17.4.
3. Push and require GitHub Actions to pass, including `test:v1174`, dependency audit, frontend typechecks/builds, and PostgreSQL integration.
4. Confirm the Cloudflare Pages custom domain `cs.ar-ai666.com` is attached to the Staff/CS Pages project with Active SSL.
5. Confirm production build/runtime configuration resolves `LUKE_SHARED_STAFF_ORIGIN` / `VITE_LUKE_SHARED_STAFF_ORIGIN` to `https://cs.ar-ai666.com` when explicitly configured.
6. Deploy backend v1.17.4.
7. Apply migration `047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql` through the normal migration runner. Do not edit migration 047 afterward.
8. Deploy CS Workspace (Staff Pro), Chat Pro, and Admin Pro. Guide Pro has only the shared release version bump unless another Guide change is present in your branch.
9. Verify `https://cs.ar-ai666.com/p/<platform-route>` opens the correct platform and bare shared CS URL shows the incomplete-link protection.
10. Verify Staff and Administrator login on the same CS Workspace; verify Staff still cannot access Admin routes.
11. Verify cross-platform route and custom-hostname mismatch rejection.
12. Verify customer messages appear right; AI/Staff/Admin replies appear left; system events center; Internal Notes never appear to customers.
13. Verify Staff My Profile can update internal name/profile picture and public support identity when Admin allows it.
14. Verify Admin can edit Staff internal/public identity, reset password, force logout, and change status.
15. Verify Support Identities manages Automated Support and Administrator names/avatars and Staff identity policy.
16. Verify Chat Menu has no Help section and managed Conversation/Promotion/Privacy/custom items behave correctly.
17. Verify custom menu links reject non-HTTPS values.
18. Verify Promotions show image preview, rich text, CTA, multiple slides, arrows/dots/autoplay, order, schedule, and drawer visibility.
19. Verify promotion rich content contains no unsafe HTML and a broken image does not hide the promotion text/CTA.
20. Verify Staff receives permanent conversation events without refresh after SSE authentication/parser repair.
21. Verify existing attachments, quick replies, transfer, resolve, return-to-AI, and custom-domain flows.
22. Watch backend logs, SSE reconnects, CORS rejections, support audit events, and migration status after rollout.

Rollback application files with the installer-created rollback package if needed. Database rollback should follow your normal production migration/restore policy rather than editing migration 047.
