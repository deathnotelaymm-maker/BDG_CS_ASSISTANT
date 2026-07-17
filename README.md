# v1.5.0 — Tenant Platform Experience + Owner Controls

This release makes each tenant’s platform independently manageable and removes
the last places where the global BDG defaults could leak into a child platform.

The patch includes:

- platform-owner editing for the current platform and its team;
- qualified tenant/platform membership queries (fixes the PostgreSQL `42702`
  ambiguity seen in the platform drawer);
- one-platform UI guard (operators can provision the platform, but child
  owners cannot create a second one);
- arbitrary platform language lists instead of a hardcoded English/Hindi list;
- local upload controls for admin, Guide, and Chat logos and favicons;
- a previewable Chat Start Studio with background upload, announcement motion,
  safe animation presets, colors, and action buttons;
- neutral tenant branding when a tenant asset is not configured (no BDG asset or
  BDG button fallback);
- Luke Admin Control chrome with the release version under the console label.

The API release marker is
`1.5.0-tenant-platform-experience-owner-controls`.

See [RELEASE_NOTES_V1.5.0.md](RELEASE_NOTES_V1.5.0.md) and
[TEST_RESULT_V1.5.0.md](TEST_RESULT_V1.5.0.md) for the implementation and
verification details.

## Short-path Windows install

Use the supplied `BDG-v150` package and double-click
`INSTALL-V150-TENANT-EXPERIENCE.cmd`. It copies only into:

`%USERPROFILE%\\Documents\\cloud-projects\\BDG_CS_ASSISTANT`

The installer does not run PowerShell, npm, Git, Render, or Cloudflare and does
not commit or push anything. When it reports success, open that repository in
GitHub Desktop, review the Changes tab, commit, and choose **Push origin**.

Render and the production Pages workflow run only after that manual push.

---

## Previous v0.11.0 notes

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
