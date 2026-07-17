BDG Help Center v1.3.0 — Chat Start Module + Experience Studio

This short release package updates only:
  %USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT

It does not use PowerShell, npm, Git, Render, Cloudflare, or automatic deployment.

1. Extract the BDG-v130 ZIP directly in Downloads.
2. Open the short BDG-v130 folder.
3. Double-click INSTALL-V130.cmd.
4. Open GitHub Desktop, choose BDG_CS_ASSISTANT, review Changes, commit, and Push origin.

The installer makes a backup beside the repository before copying the release payload.
After the backend deploys, open each tenant's platform-scoped Admin URL, then use
Settings > Theme Settings > Chat Experience to configure its start screen.

Supported animation presets: None, Fade, Slide, Pulse, Typing.
Supported layouts: Standard, Compact, Centered.
The start copy accepts safe **bold**, *italic*, and ==highlight== markers; it never
renders arbitrary HTML or JavaScript.
