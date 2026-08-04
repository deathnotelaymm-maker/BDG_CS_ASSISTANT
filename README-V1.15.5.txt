BDG CS ASSISTANT v1.15.5
SIMPLIFIED AI PRODUCTION RUNTIME
================================

Release marker:
1.15.5-simplified-ai-production-runtime

PURPOSE
-------
This release removes competing AI decision modules from the live production
path. The assistant now uses one compiled Assistant Setup runtime, one approved
Menu & Images catalog, one DeepSeek request, and server-side validation of every
selected menu, image, and button.

VISIBLE AI WORKSPACE
--------------------
1. Assistant Setup
2. Menu & Images
3. Test & Diagnostics
4. Buttons (Optional)

RETIRED FROM LIVE PRODUCTION
----------------------------
- AI Knowledge Import
- AI Q&A
- Configurable AI Source Router
- AI Locale Studio
- Prompt Version History page
- Separate AI Reliability page
- AI Response Quality
- Advanced two-stage AI routing

The Prompt Version History data and reliability settings still exist internally
where required for rollback, audit, provider retries, timeout, memory, and
fallback operation. They no longer appear as competing Admin workflow pages.

BACKEND REMOVAL CONTRACT
------------------------
The retired module endpoints return HTTP 410 with code AI_MODULE_RETIRED.
They cannot read, write, publish, route, preview, approve, test, or modify the
retired modules. Live chat never queries Q&A, imported knowledge, FAQ, Guide, or
configurable source-router records.

Historical database tables are preserved as inert rollback/audit data during
the v1.15.5 stabilization period. Migration 037 archives existing Q&A rows and
disables historical source-router settings. Do not drop those tables during the
first production deployment.

LIVE WORKFLOW
-------------
Customer message
  -> resolve tenant/platform
  -> detect language
  -> load active Assistant Setup runtime
  -> reset incompatible old memory
  -> load approved published Menu & Images only
  -> call DeepSeek once
  -> validate selected item/image/button
  -> log diagnostics
  -> return response

DATABASE
--------
New immutable migration:
backend-api/migrations/037_v1.15.5_simplified_ai_production_runtime.sql

Never edit migration 037 after deployment. The next migration must be 038.

INSTALLATION
------------
1. Extract BDG-v1155-simplified-ai-production-runtime.zip.
2. Double-click START-HERE-WINDOWS.bat.
3. Review the rollback backup path.
4. Review every Git change in GitHub Desktop.
5. Commit: v1.15.5 Simplified AI Production Runtime
6. Push and follow DEPLOYMENT_CHECKLIST_V1.15.5.md.

The installer never commits, pushes, deploys, or reads production secrets.
