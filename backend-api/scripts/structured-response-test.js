import assert from "node:assert/strict";
import {
  imageUrlsFromHtml,
  isGreetingOnly,
  normalizeResponseBlocks,
  responseBlocksFromText,
  scoreAiContent,
} from "../src/core.js";

const normalized = normalizeResponseBlocks([
  { type: "heading", text: "Deposit pending", color: "#ff00ff" },
  { type: "warning", text: "Never share your OTP." },
  { type: "steps", title: "Check this", items: ["Open Wallet", "Check history"] },
  { type: "link", label: "Official content", url: "https://example.com/help" },
  { type: "link", label: "Unsafe", url: "javascript:alert(1)" },
]);

assert.equal(normalized.length, 4, "unsafe links must be removed");
assert.equal("color" in normalized[0], false, "arbitrary model colors must be ignored");
assert.deepEqual(normalized[2].items, ["Open Wallet", "Check history"]);

const derived = responseBlocksFromText(
  "Please check these steps:\n\n1. Open Wallet\n2. Check transaction history\n\nImportant: Never share your OTP.",
);
assert.equal(derived[1].type, "steps");
assert.equal(derived[2].type, "warning");

assert.equal(isGreetingOnly("Hello!"), true);
assert.equal(isGreetingOnly("hello, my deposit is missing"), false);

const content = {
  title: "Deposit not received",
  intent_key: "deposit-not-received",
  priority: 10,
  keywords: "deposit\ndeposit not received\nrecharge pending\nbalance not added",
  positive_examples: "My deposit has not arrived\nMoney deducted but balance not added",
  negative_examples: "How do I deposit?\nWithdrawal not received\nHello",
};
assert.equal(scoreAiContent("hello", content).score, 0, "greetings must never select content");
assert.ok(scoreAiContent("My deposit has not arrived", content).score >= 86);
assert.equal(scoreAiContent("How do I deposit?", content).score, -100);
assert.ok(scoreAiContent("deposit", content).score < 70, "one broad word cannot select content");

assert.deepEqual(
  imageUrlsFromHtml('<p>Text</p><img src="https://cdn.example.com/a.png"><img src="javascript:bad">'),
  ["https://cdn.example.com/a.png"],
);

console.log("PASS structured response normalization");
console.log("PASS unsafe response links are rejected");
console.log("PASS greetings bypass AI Content routing");
console.log("PASS high-confidence positive and negative examples");
console.log("PASS visual editor image URLs are safely extracted");
console.log("\n5/5 structured and prompt-first checks passed");
