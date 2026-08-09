Luke v1.17.4-R2 - Regression Contract Stabilization

Application version: 1.17.4
Package revision: R2
Base: v1.17.4-R1
Current migration: 047 (unchanged)
Next migration: 048

Purpose:
GitHub CI was failing on a stale Human Support source assertion that still expected
"Luke Support Workspace" after v1.17.4 intentionally renamed the operator application
to "Luke CS Workspace".

R2 changes only regression/CI contracts and release engineering files. It does not
change the production feature implementation or database schema.

Recommended commit:
v1.17.4-R2 regression contract stabilization
