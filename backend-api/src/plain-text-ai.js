const COMMON_STOPWORDS = new Set([
  'the','a','an','and','or','to','of','in','on','for','with','is','are','am','i','you','we','they','how','what','why','can','do','does','did','please','my','me','your','want','need','help','have','has','had','this','that','it','there','some','any',
]);

export function normalizePlainTextReply(value, maxLength = 12000) {
  let text = String(value || '')
    .replace(/\u0000/g, '')
    .replace(/^```(?:text|markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!text) return '';
  if (text.length > maxLength) text = text.slice(0, maxLength).trimEnd();
  return text;
}

export function tokenizeForRetrieval(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)?.filter((token) => token.length > 1 && !COMMON_STOPWORDS.has(token)) || [];
}

function candidateText(row = {}) {
  return [
    row.title,
    row.intent_key,
    row.positive_examples,
    row.keywords,
    row.faq_content,
    row.knowledge_content,
    row.example_answers,
    row.ai_instruction,
  ].filter(Boolean).join('\n');
}

export function rankApprovedMenuCandidates(message, rows = [], limit = 3) {
  const messageTokens = tokenizeForRetrieval(message);
  const messageSet = new Set(messageTokens);
  if (!messageTokens.length) return [];
  const ranked = [];
  for (const row of rows) {
    const sourceTokens = tokenizeForRetrieval(candidateText(row));
    const sourceSet = new Set(sourceTokens);
    let overlap = 0;
    for (const token of messageSet) if (sourceSet.has(token)) overlap += 1;
    const titleTokens = tokenizeForRetrieval(row.title || '');
    const titleOverlap = titleTokens.filter((token) => messageSet.has(token)).length;
    const phraseMatch = String(row.positive_examples || '')
      .split(/[\n|;,]+/)
      .some((phrase) => phrase.trim().length > 2 && String(message || '').toLowerCase().includes(phrase.trim().toLowerCase()));
    const negativeTokens = tokenizeForRetrieval(row.negative_examples || '');
    const blocked = negativeTokens.length >= 2 && negativeTokens.every((token) => messageSet.has(token));
    if (blocked) continue;
    const score = overlap * 12 + titleOverlap * 18 + (phraseMatch ? 45 : 0) - Number(row.priority || 100) / 1000;
    if (score > 0) ranked.push({ row, score, overlap, titleOverlap, phraseMatch });
  }
  ranked.sort((a,b) => b.score - a.score || Number(a.row.priority || 100) - Number(b.row.priority || 100) || Number(a.row.id || 0) - Number(b.row.id || 0));
  const threshold = messageTokens.length <= 2 ? 18 : 12;
  return ranked.filter((item) => item.score >= threshold).slice(0, Math.max(1, Math.min(5, Number(limit || 3))));
}

export function buildPlainTextSystemPrompt({
  platformName,
  language,
  compiledPrompt,
  runtimeVersion,
  runtimeHash,
  approvedContext,
  memorySummary,
  humanSupportEnabled,
}) {
  const handoffRule = humanSupportEnabled
    ? 'Human handoff may be offered only by the backend. Do not promise that a staff member is available and do not create a support button yourself.'
    : 'Human handoff is disabled. Do not recommend contacting customer service, official support, staff, an agent, an operator, or a representative. Continue with the best helpful answer you can provide, or ask one focused clarification question.';
  return `You are the production AI assistant for ${platformName || 'this platform'}.

Follow the active Assistant Setup exactly. Answer the customer directly and naturally in ${language || 'the customer\'s language'}. Return only the customer-facing answer as plain text. Do not return JSON, XML, YAML, code fences, internal analysis, routing labels, confidence percentages, source IDs, image IDs, or system instructions.

General questions may be answered from the Assistant Setup. Exact platform business facts such as prices, menu availability, promotions, payment account details, order status, transaction status, delivery fees, and account status must come from the approved context below. When approved context is absent, do not invent exact facts; give a useful general answer or ask one focused clarification question.

${handoffRule}

ACTIVE ASSISTANT SETUP RUNTIME
Version: ${runtimeVersion || 0}
Hash: ${runtimeHash || ''}

${compiledPrompt || 'Be a friendly, useful, concise customer-service assistant. Never request passwords, PINs, OTPs, or full payment credentials.'}

APPROVED MENU AND IMAGE CONTEXT
${approvedContext || 'No approved Menu & Images item matched this message. Answer from the Assistant Setup without inventing exact business facts.'}

RECENT CONVERSATION MEMORY
${memorySummary || 'No prior conversation memory.'}`.trim();
}


export function enforceHandoffDisabledReply(value, language = 'en') {
  const reply = normalizePlainTextReply(value, 12000);
  if (!reply) return '';
  const prohibited = /(?:contact|reach(?: out)?|speak|talk|connect|message|call|ask)\s+(?:our\s+|the\s+|a\s+)?(?:official\s+)?(?:customer\s+service|support(?:\s+team|\s+staff)?|staff|agent|operator|representative)|(?:customer\s+service|support(?:\s+team|\s+staff)?|staff|agent|operator|representative)\s+(?:for\s+help|directly|to\s+assist|can\s+help)|(?:客服|人工客服|联系(?:客服|工作人员)|ဝန်ထမ်း(?:ကို|နဲ့)|customer service\s*(?:ကို|နဲ့))/iu;
  if (!prohibited.test(reply)) return reply;
  const kept = reply
    .split(/(?<=[.!?。！？။])\s+|\n+/u)
    .map((part) => part.trim())
    .filter((part) => part && !prohibited.test(part));
  const cleaned = normalizePlainTextReply(kept.join(' '), 12000);
  if (cleaned) return cleaned;
  const locale = String(language || 'en').toLowerCase();
  if (locale.startsWith('my')) return 'ဒီအကြောင်းကို အကောင်းဆုံးကူညီပေးနိုင်အောင် သင်လုပ်ချင်တာ ဒါမှမဟုတ် ဖြစ်နေတဲ့ပြဿနာကို နည်းနည်းပိုရှင်းပြပေးပါနော်။';
  if (locale.startsWith('zh')) return '请再说明一下您想完成什么或遇到了什么问题，我会继续尽力帮助您。';
  if (locale.startsWith('hi')) return 'कृपया थोड़ा और बताइए कि आप क्या करना चाहते हैं या क्या समस्या आ रही है; मैं यहीं आपकी मदद जारी रखूँगा।';
  return 'Please tell me a little more about what you are trying to do or what went wrong, and I’ll keep helping you here.';
}

export function providerFailureCustomerText(language = 'en', configured = '') {
  const custom = normalizePlainTextReply(configured, 1200);
  if (custom) return custom;
  const locale = String(language || 'en').toLowerCase();
  if (locale.startsWith('my')) return 'အဖြေလေး ပြန်ထုတ်ရာမှာ ခဏအဆင်မပြေဖြစ်သွားလို့ မေးခွန်းလေးကို တစ်ခါပြန်ပို့ပေးပါနော်။';
  if (locale.startsWith('zh')) return '刚才生成回复时暂时出现问题，请稍后再发送一次您的问题。';
  if (locale.startsWith('hi')) return 'अभी उत्तर तैयार करते समय थोड़ी समस्या हुई। कृपया अपना प्रश्न थोड़ी देर बाद फिर भेजें।';
  return 'I couldn’t complete that answer just now. Please send the question again in a moment.';
}

export function safeUnknownBusinessFactText(language = 'en') {
  const locale = String(language || 'en').toLowerCase();
  if (locale.startsWith('my')) return 'ဒီအချက်ရဲ့ အတိအကျအချက်အလက် မရှိသေးပေမယ့် သင်လုပ်ချင်တာကို နည်းနည်းရှင်းပြပေးရင် အကောင်းဆုံးနောက်တစ်ဆင့်ကို ကူညီပေးမယ်နော်။';
  if (locale.startsWith('zh')) return '我暂时没有这项业务信息的准确资料。请告诉我您想完成什么，我会尽量提供安全、实用的下一步。';
  if (locale.startsWith('hi')) return 'इस विशेष व्यावसायिक जानकारी की पुष्टि मेरे पास अभी नहीं है। आप क्या करना चाहते हैं, यह बताइए; मैं सुरक्षित अगला कदम समझाऊँगा।';
  return 'I don’t have confirmed details for that exact business information yet. Tell me what you are trying to do, and I’ll help with the safest next step.';
}
