# v1.15.1 CI platform-context fixture repair

This marker confirms that the post-release CI repair is present in this
checkout.

The PostgreSQL integration suite invokes the backend handler in-process. Public
FAQ reads now use the shared Chat Pages origin
`https://bdg-chat-pages.pages.dev`. A separate negative assertion uses
`https://unmapped-customer.example.test` and requires
`PLATFORM_CONTEXT_MISMATCH`, preserving the production custom-hostname security
boundary.

No Cloudflare or Render request is made by this test, and no
`SKIP_CLOUDFLARE_PLATFORM_CHECK` bypass is supported.

Verification markers:

- `backend-api/scripts/integration-test.js` defines `SHARED_CHAT_ORIGIN`.
- The successful public FAQ request is labelled
  `Read public FAQs through the shared Chat hostname`.
- The deliberate mismatch is labelled
  `Reject a route that does not match the custom hostname`.
- `backend-api/scripts/regression-test.js` reports 41 checks.
