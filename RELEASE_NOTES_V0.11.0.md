# v0.11.0 — Advanced AI Knowledge Import + Multi-Platform Support Router

## What changed

- Added an Excel `.xlsx` import studio in Admin.
- Imports are stored as review batches and create drafts only after an explicit action.
- Imported content preserves source sheet, row, optional ticket label, and optional image reference for review.
- Added support platform profiles with `none`, `tickets`, and `hybrid` support modes.
- Added platform-aware action-button filtering, including an automatic ticket-button safeguard.
- Added `?platform=<key>` to Guide and Chat API requests.
- Added platform/import context to Chat Logs and AI Diagnostics.
- Added a formal v0.11.0 schema migration and regression coverage.

## Safety rules

- AI routing remains prompt-first. The backend does not score or choose knowledge by keywords.
- Images are output only, never knowledge-routing input.
- AI can use only published, approved content in the selected platform scope.
- Excel imports never activate content or create tickets automatically.
- Ticket action buttons require a selected platform with Tickets or Hybrid mode.

## Deployment

Use the double-click v0.11.0 installer, then commit and push through GitHub Desktop. Render deploys the backend from `main`; GitHub Actions deploys Pages after the matching Render version is live.
