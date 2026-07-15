# v0.11.0 — Advanced AI Knowledge Import + Multi-Platform Support Router

This release turns **AI Prompt & Image** into a safer advanced knowledge workflow:

- Import `.xlsx` workbooks into a review batch instead of changing live AI immediately.
- Create editable **AI Content drafts** from approved spreadsheet rows.
- Use the existing Prompt & Image studio to review answers, examples, rich visual knowledge, and buttons before publishing.
- Create support-platform profiles for apps with **no tickets**, **tickets**, or a **hybrid** support flow.
- Limit ticket buttons to platforms that actually have tickets; normal support buttons work everywhere you permit them.
- Send `?platform=your-platform-key` in Chat or Guide URLs to select the correct platform behaviour.

See [V0.11.0_IMPORT_QUICKSTART.md](V0.11.0_IMPORT_QUICKSTART.md) for the safe import sequence and [RELEASE_NOTES_V0.11.0.md](RELEASE_NOTES_V0.11.0.md) for the full change list.

## Active stack
- Cloudflare Pages: Guide Pro, Chat Pro, Admin Pro
- Render paid web service: Node.js API in Singapore
- Existing Neon PostgreSQL: pooled runtime URL plus direct migration URL
- Cloudflare R2: guide/chat images
- DeepSeek: AI

**No Render PostgreSQL database is created. No production data transfer is required.**

The infrastructure remains Render + Neon + Cloudflare Pages + R2 + DeepSeek.

## Easy release workflow

Use the v0.11.0 release installer once. It is a double-click Windows installer—no PowerShell commands. It safely backs up changed files, installs the patch, and runs local checks.

After it succeeds:

1. Open the project in GitHub Desktop.
2. Commit the displayed changes to `main`.
3. Click **Push origin**.

Render then deploys the API automatically. The included GitHub Actions workflow waits for the matching Render version and publishes Guide, Chat, and Admin to Cloudflare Pages.
