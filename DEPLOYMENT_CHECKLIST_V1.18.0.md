# Luke CS v1.18.0 Deployment Checklist

1. Confirm current Luke CS source is v1.17.4 and Git clean.
2. Review the v1.18.0 source diff and commit separately from Luke Shop.
3. Snapshot the Luke CS PostgreSQL database.
4. Apply migration `048_v1.18.0_luke_shop_commerce_connector_v2.sql` through the normal migration runner.
5. Deploy Luke CS Backend, Admin Pro and Chat Pro from the reviewed commit.
6. In Luke Shop Merchant Admin, create a scoped Luke CS commerce credential.
7. In Luke CS Platform Control Center → Shop Commerce, configure the Shop backend URL and one-time credential.
8. Enable only the required read-only tools and test the connection.
9. From a logged-in Shop customer session, open Luke CS and confirm the connected customer code appears.
10. Test food, physical-shipping and digital-download order questions, plus payment/refund status.
11. Test expired/invalid customer context and provider-outage fallback.
12. Do not enable any commerce write capability in this release.
