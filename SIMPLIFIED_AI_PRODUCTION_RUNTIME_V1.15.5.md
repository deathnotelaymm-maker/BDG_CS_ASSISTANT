# Simplified AI Production Runtime — Operator Guide

## Daily Admin workflow

### 1. Configure Assistant Setup

Keep the ten prompt sections concise and non-conflicting. Save every change and
confirm that the active runtime version and hash change.

Recommended production values:

```text
AI enabled: ON
Conversation memory: OFF during initial acceptance tests
Temperature: 0.2
Max tokens: 1200
Retries: 1 or 2
Provider timeout: 12000 ms
Fallback: Clarify, then human
Human handoff URL: official support URL
```

Enable conversation memory only after fresh-session tests pass.

### 2. Add Menu & Images

For each real product, enter:

- menu name;
- stable item key;
- language;
- actual description;
- actual ingredients and allergy notes;
- actual price;
- actual availability;
- delivery conditions;
- accepted payment methods;
- positive examples;
- negative examples;
- approved image;
- optional approved button.

Keep the item as Draft until reviewed. Live use requires both:

```text
Status = Published
Approval = Approved
```

### 3. Test

Use meaningful questions, not only “Hi”. Test at least:

```text
ဗိုက်ဆာနေတယ်၊ ဘာစားရမလဲ
ဘာမီနူးတွေရှိလဲ
Delivery free လား
KBZPay နဲ့ပေးလို့ရလား
ဒီနေ့ ဘာကောင်းလဲ
```

Confirm:

- one-call runtime;
- correct prompt runtime version/hash;
- Burmese response for Burmese input;
- correct menu match or general Assistant Setup answer;
- approved image only;
- no old verified-information fallback unless the provider is degraded;
- no retired source type in diagnostics.

## What not to do

- Do not place changing prices only inside Assistant Setup.
- Do not publish placeholder menu facts.
- Do not put passwords, OTPs, API keys, or private account data in prompts.
- Do not edit migration 037 after deployment.
- Do not restore old Q&A or router rows directly in production.
- Do not enable conversation memory before fresh tests pass.

## Rollback behavior

The installer creates a repository backup. Migration 037 is data-preserving:
old Q&A records are archived rather than deleted, and old router tables remain.
If application rollback is necessary, restore the code backup and intentionally
review the archived data before reactivating any old workflow.
