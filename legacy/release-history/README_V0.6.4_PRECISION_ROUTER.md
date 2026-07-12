# v0.6.4 — Precision AI Router + Conversation State + Safe Guide Delivery

## Deployment

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.6.4-precision-ai-router-safe-guide-delivery-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.6.4-precision-ai-router-safe-guide-delivery
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.6.4-WINDOWS.ps1
```

## Worker check

```powershell
curl.exe "https://bdg-ai-help-api.bdgservice.workers.dev/health?v=064-precision"
```

Expected: `0.6.4-worker`

## AI behavior
The system now uses this flow:

1. Check language and conversation state.
2. Detect intent from positive examples, keywords, typo keywords, and language variations.
3. Check negative examples and excluded situations.
4. Compare best intent and second-best intent.
5. Apply confidence bands.
6. Ask one clarification when needed.
7. Apply risk level and confirmation rules.
8. Send only approved Smart Guide content and images.

## Admin setup
Open Admin → Smart Match Guide. Configure:

- Intent ID
- Positive examples
- Negative examples
- Required information
- Excluded situations
- Risk level
- Confirmation rule
- Official response text
- Language-specific images
- Response layout

Use the AI Test Lab box to preview routing decisions before publishing.
