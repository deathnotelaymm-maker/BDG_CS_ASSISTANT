BDG HELP CENTER v1.15.4 - PROMPT RUNTIME AND VERSIONING REPAIR

1. Extract BDG-v1154-prompt-runtime-versioning-repair.zip.
2. Double-click START-HERE-V1.15.4-PROMPT-RUNTIME-VERSIONING-REPAIR.bat.
3. Wait for: V1.15.4 PROMPT RUNTIME AND VERSIONING REPAIR INSTALLED AND VERIFIED.
4. Open GitHub Desktop and review the repository Changes tab.
5. Commit v1.15.4 and Push origin.
6. Follow DEPLOYMENT_CHECKLIST_V1.15.4.md.

Default repository target:
C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT

Alternative target:
- Set BDG_TARGET before running the installer; or
- Run INSTALL-V1.15.4-PROMPT-RUNTIME-VERSIONING-REPAIR.cmd "D:\path\to\repository"

Release marker:
1.15.4-prompt-runtime-versioning-repair

Database migration:
036_v1.15.4_prompt_runtime_versioning_repair.sql

After deployment:
- Open Admin -> AI Prompt Manager.
- Confirm the correct platform and route.
- Save a prompt section.
- Confirm the active runtime version and SHA-256 change.
- Preview the exact compiled runtime.
- Run a fresh test in Admin -> AI Diagnostics.
- Verify the runtime hash in Chat Logs.

Keep DEEPSEEK_API_KEY secret in Render. Never paste it into repository files.
