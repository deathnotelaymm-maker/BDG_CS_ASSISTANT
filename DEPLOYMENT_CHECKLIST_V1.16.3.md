# Deployment Checklist — v1.16.3

## Before deployment

- [ ] Confirm the repository backend is v1.16.2 or an existing v1.16.3 tree.
- [ ] Confirm migration `040` exists and was previously deployed.
- [ ] Create a Neon snapshot.
- [ ] Record current Render and Cloudflare Pages releases.
- [ ] Confirm the repair installer and Git diff contain only reviewed files.

## Deployment order

- [ ] Push the v1.16.3 commit.
- [ ] Allow Render to deploy the backend.
- [ ] Confirm migration `041` completed.
- [ ] Verify `/health` reports `1.16.3-admin-contract-chat-flow-theme-separation`.
- [ ] Deploy Guide, Chat, Staff, then Admin.
- [ ] Confirm all production Pages releases use the matching backend marker.

## Admin contract acceptance

- [ ] Menu & Images opens without calling `/admin/support-platforms`.
- [ ] Global Buttons opens without calling `/admin/support-platforms`.
- [ ] A Menu & Images item can be created, approved, published, edited, and archived.
- [ ] A global button can be created, edited, displayed, and archived.
- [ ] Cross-platform headers cannot read or write another platform’s records.

## Chat flow acceptance

- [ ] Send one customer question and confirm the composer locks.
- [ ] Attempt a second request from another tab and confirm HTTP 409.
- [ ] Confirm the composer unlocks after final success.
- [ ] Confirm the composer unlocks after final failure.
- [ ] Confirm Human Support mode still permits staff/customer conversation.
- [ ] Confirm staff resolution returns the customer to the automated workflow.

## History acceptance

- [ ] Refresh a conversation with more than ten messages.
- [ ] Confirm only the latest ten messages load initially.
- [ ] Confirm the view opens at the latest unread/newest message.
- [ ] Select **Show previous messages** and load ten older messages.
- [ ] Confirm the visible scroll position is preserved.
- [ ] Confirm live incoming messages still arrive through realtime/catch-up.

## Appearance acceptance

- [ ] Change Guide Theme and verify Chat does not change.
- [ ] Change Chat Theme and verify Guide does not change.
- [ ] Confirm the public Chat language dropdown is absent.
- [ ] Confirm changed Admin forms contain no hard-coded Burmese examples.
- [ ] Confirm global buttons use one label with no Hindi-specific field.

## Rollback

- [ ] Use the installer-created `RESTORE-V1.16.3.ps1` only if source rollback is required.
- [ ] Do not edit or delete an already applied migration `041`.
- [ ] Restore the Neon snapshot only through the approved database rollback process.
