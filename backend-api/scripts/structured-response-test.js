import assert from "node:assert/strict";
import {
  normalizeResponseBlocks,
  responseBlocksFromText,
  shouldAttachOptionalGuide,
} from "../src/core.js";

const normalized = normalizeResponseBlocks([
  { type: "heading", text: "Deposit pending", color: "#ff00ff" },
  { type: "warning", text: "Never share your OTP." },
  {
    type: "steps",
    title: "Check this",
    items: ["Open Wallet", "Check history"],
  },
  { type: "link", label: "Official guide", url: "https://example.com/guide" },
  { type: "link", label: "Unsafe", url: "javascript:alert(1)" },
]);

assert.equal(normalized.length, 4, "unsafe links must be removed");
assert.equal(
  "color" in normalized[0],
  false,
  "model/admin arbitrary colors must be ignored",
);
assert.deepEqual(normalized[2].items, ["Open Wallet", "Check history"]);

const derived = responseBlocksFromText(
  "Please check these steps:\n\n1. Open Wallet\n2. Check transaction history\n\nImportant: Never share your OTP.",
);
assert.equal(derived[1].type, "steps");
assert.equal(derived[2].type, "warning");

const row = {
  attach_mode: "auto_when_clear",
  image_urls: "https://example.com/deposit-guide.png",
  image_urls_hi: "",
  when_not_to_attach: "already solved",
  negative_keywords: "",
  negative_examples: "",
  excluded_situations: "",
};
const decision = { action: "send" };

assert.equal(
  shouldAttachOptionalGuide(row, decision, "My deposit has not arrived").attach,
  false,
  "text-only questions must not receive an image automatically",
);
assert.equal(
  shouldAttachOptionalGuide(
    row,
    decision,
    "Show me the steps for a missing deposit",
  ).attach,
  true,
  "explicit visual-step requests should receive the matching image",
);
assert.equal(
  shouldAttachOptionalGuide(
    row,
    decision,
    "Show me the guide, but it is already solved",
  ).attach,
  false,
  "when-not-to-attach rules must override visual requests",
);

console.log("PASS structured response normalization");
console.log("PASS semantic colors reject arbitrary color values");
console.log("PASS unsafe response links are rejected");
console.log("PASS precision guide attachment decisions");
console.log("\n4/4 structured response checks passed");
