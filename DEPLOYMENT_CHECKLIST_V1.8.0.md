# v1.8.0 deployment checklist

1. Extract `BDG-v180.zip` into a short folder such as `C:\BDG-v180`.
2. Double-click `INSTALL-V1.8.0-AI-QA-RICH-FAQ.cmd`.
3. Open GitHub Desktop and select `BDG_CS_ASSISTANT` at
   `C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT`.
4. Review the changed files, commit the v1.8.0 release, and push `main`.
5. Wait for Render to run the migration and report the v1.8.0 health version.
6. Confirm the three Pages builds use the same API release before testing a tenant URL.
7. In Admin, import a workbook, create drafts, review rich answers/images, then approve and publish selected Q&A rows.
8. Test a locale-specific FAQ and a Q&A item from the child platform route.

The installer only copies files and creates a backup. It does not run npm, PowerShell, Git, Render, or Cloudflare commands.
