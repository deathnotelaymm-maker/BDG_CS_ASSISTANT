import assert from "node:assert/strict";
import {
  imageUrlsFromHtml,
  isGreetingOnly,
  normalizeResponseBlocks,
  responseBlocksFromText,
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

const rich = normalizeResponseBlocks([{type:"paragraph",segments:[{text:"Important",marks:{bold:true,color:"brand",highlight:"warning"}}]},{type:"button",label:"Open deposit",url:"bdg://deposit",action_type:"deep_link"},{type:"button",label:"Unsafe",url:"javascript:alert(1)"},{type:"image",url:"https://cdn.example.com/guide.png"}]);
assert.equal(rich.length,3);
assert.equal(rich[0].segments[0].marks.color,"brand");
assert.equal(rich[1].url,"bdg://deposit");

assert.deepEqual(
  imageUrlsFromHtml('<p>Text</p><img src="https://cdn.example.com/a.png"><img src="javascript:bad">'),
  ["https://cdn.example.com/a.png"],
);

console.log("PASS structured response normalization");
console.log("PASS unsafe response links are rejected");
console.log("PASS structured-v2 marks and approved deep links");
console.log("PASS visual editor image URLs are safely extracted");
console.log("\n4/4 structured and prompt-first checks passed");
