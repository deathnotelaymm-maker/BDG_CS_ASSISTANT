Luke v1.17.4-R1 - CI / Source Synchronization Hotfix

Purpose:
  Re-apply the authoritative v1.17.4 Staff source and improve CI diagnostics.

Application version:
  1.17.4

Database:
  No new migration. Migration 047 remains current. Next migration remains 048.

Install:
  Run START-HERE-WINDOWS.bat

Default repository:
  C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT

Custom repository:
  INSTALL-V1.17.4-R1-CI-SOURCE-SYNC-HOTFIX.cmd "D:\your\BDG_CS_ASSISTANT"

The installer creates a rollback backup, verifies hashes, copies only reviewed files, and runs dependency-free R1 checks. It does not commit, push, deploy, access secrets, or apply migrations.
