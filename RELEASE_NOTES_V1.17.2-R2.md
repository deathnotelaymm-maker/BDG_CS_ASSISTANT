# v1.17.2-r2 — Luke Integration Origin Contract Hotfix

Runtime remains **1.17.2**. Migration **045** is unchanged.

GitHub integration failed because its Admin fixture used `https://admin.example.test`. In v1.17.2, an unknown hostname is intentionally treated as a candidate customer custom hostname. Combining that synthetic hostname with `X-BDG-Platform-Route` correctly triggered `PLATFORM_CONTEXT_MISMATCH`.

The integration fixture now uses Luke's actual shared Admin contract: `https://admin.ar-ai666.com`. The separate `unmapped-customer.example.test` assertion is preserved, so strict custom-domain mismatch protection remains tested.

No production resolver, CORS rule, database schema, migration, tenant isolation, or hostname security behavior is weakened.
