# v0.5.8 — Admin Login API + Guide Pro Data Binding Fix

## Fixed
- Worker login now uses a robust body parser instead of relying only on `request.json()`.
- Worker now accepts login aliases:
  - `/auth/login`
  - `/login`
  - `/api/login`
- Worker now accepts normal JSON, form-style body, and malformed PowerShell/curl bodies such as `{email:admin@example.com,password:ChangeMe123!}`.
- Guide Pro no longer sends `category=undefined` or `q=undefined` to the Worker.
- Guide Pro now calls `/guides?language=en|hi` correctly.
- Guide Pro cards should now render the published IFSC and other guide articles returned by the Worker.
- Guide Pro detail page uses localized English/Hindi translations from the Worker response.
- Guide Pro Hindi UI copy improved for the guide list screen and mobile nav.

## Why this patch exists
The Worker health and `/guides?lang=en` endpoint were already working in v0.5.7, but admin login still returned a JSON parse error and Guide Pro filtered real data out by sending undefined query values.

## Deploy check
After deployment, check:

```powershell
curl.exe https://bdg-ai-help-api.bdgservice.workers.dev/health
```

Expected version:

```text
0.5.8-worker
```

Then test login:

```powershell
$body = @{ email = "admin@example.com"; password = "ChangeMe123!" } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri "https://bdg-ai-help-api.bdgservice.workers.dev/auth/login" -ContentType "application/json" -Body $body
```
