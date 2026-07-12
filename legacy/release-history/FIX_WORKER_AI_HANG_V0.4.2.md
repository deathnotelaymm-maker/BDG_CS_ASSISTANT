# Fix Worker AI Hang

The Worker `/admin/ai/test` endpoint could hang when the DeepSeek request did not return quickly enough. Cloudflare then canceled the request with:

`The Workers runtime canceled this request because it detected that your Worker's code had hung and would never generate a response.`

v0.4.2 fixes this by adding a 12-second DeepSeek timeout and returning the local approved FAQ/guide fallback when DeepSeek is unavailable.

## Deploy fix

From the project root:

```powershell
cd $env:USERPROFILE\Downloads\one-domain-help-ai-admin-v0.4.2-worker-ai-timeout-fix\worker-api
copy ..\worker-api\wrangler.toml .\wrangler.toml
wrangler deploy
```

If you are updating an existing local folder instead of replacing the full project, copy only:

- `worker-api/src/index.js`
- `admin-site/app.js`

Then run:

```powershell
cd worker-api
wrangler deploy
```

## Test diagnostics

Open this in browser after logging into admin, or use admin token:

`https://bdg-ai-help-api.bdgservice.workers.dev/admin/ai/diagnostics`

Better: test from Admin → AI Mode → AI Test Playground.

Expected: the request must return a reply. If DeepSeek is slow or wrong, it will say DeepSeek: no and show a DeepSeek note.
