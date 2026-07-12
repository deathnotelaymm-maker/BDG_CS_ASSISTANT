# v0.6.7 — AI Guide Builder + Hindi Layout Assistant

This release improves the Guide CMS editing workflow. Admin can paste official raw guide text, let the AI Guide Builder organize it into a professional editable block layout, then manually adjust before publishing.

## Main features

- AI Guide Builder inside the Guide section.
- Paste raw official text and generate editable blocks.
- Layout styles: Problem → Solution, Simple Step Guide, Image First, FAQ, Warning/Security, Long Tutorial.
- AI-generated title, summary, slug, keywords, category suggestion, and image placeholders.
- Copy English layout to Hindi / Indian draft.
- Copy English text into Hindi draft for manual translation.
- Separate Hindi / Indian screenshots remain supported.
- Admin approval required before publishing; AI must not invent rules, amounts, waiting times, or security procedures.

## Deploy

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.6.7-ai-guide-builder-hindi-layout-assistant-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.6.7-ai-guide-builder-hindi-layout-assistant
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.6.7-WINDOWS.ps1
```

## Check

```powershell
curl.exe "https://bdg-ai-help-api.bdgservice.workers.dev/health?v=067-final"
```
Expected version: `0.6.7-worker`.
