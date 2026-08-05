BDG v1.16.1-r2 - Windows Verifier Bootstrap Hotfix
======================================================

This package is the complete v1.16.1 application repair with corrected
Windows installer startup.

ROOT CAUSE
  The original PowerShell verifier used $PSScriptRoot as a parameter default.
  On the affected Windows invocation the parameter became an empty string,
  causing Test-Path -LiteralPath to fail before any file was copied.

R2 REPAIR
  - The CMD installer passes the normalized package root explicitly.
  - Both PowerShell verifiers also resolve their own script directory when
    PackageRoot is omitted or empty.
  - Empty and invalid paths are rejected with clear messages.
  - Application code, migration 039, APIs, and runtime behavior are unchanged.

INSTALL
  1. Close the failed original installer.
  2. Delete the previously extracted original package folder.
  3. Extract this r2 ZIP into a fresh local folder.
  4. Double-click START-HERE-WINDOWS.bat.

The failed original run stopped at step 1/7, so it did not create a backup or
copy files into the project.
