const COPY = {
  en: {
    greeting: "Hello! I’m here and ready to help. What can I assist you with?",
    thanks: "You’re welcome. If you need anything else, just tell me.",
    goodbye: "Take care. I’ll be here whenever you need help.",
    laughter: "I’m here with you. Tell me what you’d like help with whenever you’re ready.",
    boundary: "I’m here to help, but let’s keep the conversation respectful. Tell me the issue and I’ll do my best to assist.",
    help: "I can help with questions covered by this support center. Describe the issue or the result you want.",
    unknown: "I don’t have a verified answer yet. Add a little more detail, or contact support, and I’ll keep helping.",
    provider: "The AI service is having trouble right now. I can still use verified support information, so please retry your question or contact support.",
    support: "Contact support",
    retry: "Try again",
    online: "Online assistant",
    welcome: (name) => `Please describe your issue and ${name} Support will guide you step by step.`,
    welcomeTitle: (name) => `Welcome to ${name} Support`,
    placeholder: "Type your message...",
    busy: "Please wait for the current reply...",
  },
  id: {
    greeting: "Halo! Saya siap membantu. Ada yang bisa saya bantu?",
    thanks: "Sama-sama. Jika ada hal lain, silakan beri tahu saya.",
    goodbye: "Sampai jumpa. Saya siap membantu kapan pun Anda membutuhkannya.",
    laughter: "Saya di sini untuk membantu. Silakan beri tahu apa yang Anda butuhkan saat Anda siap.",
    boundary: "Saya siap membantu, tetapi mari tetap berbicara dengan sopan. Jelaskan masalahnya dan saya akan berusaha membantu.",
    help: "Saya dapat membantu dengan pertanyaan yang tercakup di pusat bantuan ini. Jelaskan masalah atau hasil yang Anda inginkan.",
    unknown: "Saya belum memiliki jawaban yang terverifikasi. Tambahkan sedikit detail atau hubungi dukungan, dan saya akan terus membantu.",
    provider: "Layanan AI sedang mengalami gangguan. Saya masih dapat menggunakan informasi dukungan yang terverifikasi; coba kirim ulang pertanyaan Anda atau hubungi dukungan.",
    support: "Hubungi dukungan",
    retry: "Coba lagi",
    online: "Asisten online",
    welcome: (name) => `Jelaskan masalah Anda dan Dukungan ${name} akan memandu Anda langkah demi langkah.`,
    welcomeTitle: (name) => `Selamat datang di Dukungan ${name}`,
    placeholder: "Ketik pesan Anda...",
    busy: "Harap tunggu jawaban saat ini...",
  },
  hi: {
    greeting: "नमस्ते! मैं आपकी मदद के लिए तैयार हूँ। मैं क्या सहायता कर सकता हूँ?",
    thanks: "आपका स्वागत है। किसी और मदद की ज़रूरत हो तो बताइए।",
    goodbye: "अपना ध्यान रखें। ज़रूरत पड़ने पर मैं यहीं हूँ।",
    laughter: "मैं आपकी मदद के लिए यहाँ हूँ। तैयार होने पर बताइए कि आपको किस चीज़ में सहायता चाहिए।",
    boundary: "मैं मदद के लिए यहाँ हूँ, लेकिन कृपया बातचीत सम्मानजनक रखें। समस्या बताइए और मैं सहायता करने की पूरी कोशिश करूँगा।",
    help: "मैं इस सहायता केंद्र में उपलब्ध विषयों पर मदद कर सकता हूँ। अपनी समस्या या इच्छित परिणाम बताइए।",
    unknown: "मुझे अभी सत्यापित उत्तर नहीं मिला। थोड़ी और जानकारी दें या सहायता टीम से संपर्क करें।",
    provider: "AI सेवा में अभी समस्या है। मैं सत्यापित सहायता जानकारी का उपयोग कर सकता हूँ; प्रश्न दोबारा भेजें या सहायता टीम से संपर्क करें।",
    support: "सहायता से संपर्क करें",
    retry: "फिर प्रयास करें",
    online: "ऑनलाइन सहायक",
    welcome: (name) => `अपनी समस्या बताइए और ${name} सहायता आपको चरण-दर-चरण मार्गदर्शन देगी।`,
    welcomeTitle: (name) => `${name} सहायता में आपका स्वागत है`,
    placeholder: "अपना संदेश लिखें...",
    busy: "कृपया वर्तमान उत्तर की प्रतीक्षा करें...",
  },
  zh: {
    greeting: "您好！我已准备好帮助您。请问需要什么帮助？",
    thanks: "不客气。如果还需要帮助，请随时告诉我。",
    goodbye: "再见。需要帮助时，我会一直在这里。",
    laughter: "我在这里帮助您。准备好后，请告诉我您需要什么帮助。",
    boundary: "我愿意帮助您，但请保持尊重。请说明问题，我会尽力协助。",
    help: "我可以解答本帮助中心涵盖的问题。请描述问题或您希望达成的结果。",
    unknown: "我暂时没有找到经过验证的答案。请补充一点信息或联系支持团队，我会继续帮助您。",
    provider: "AI 服务目前遇到问题。我仍可使用经过验证的支持信息；请重试问题或联系支持团队。",
    support: "联系支持",
    retry: "重试",
    online: "在线助手",
    welcome: (name) => `请描述您的问题，${name} 支持将逐步为您提供指导。`,
    welcomeTitle: (name) => `欢迎使用 ${name} 支持`,
    placeholder: "输入您的消息...",
    busy: "请等待当前回复完成...",
  },
  my: {
    greeting: "မင်္ဂလာပါ။ ကူညီရန် အသင့်ရှိပါသည်။ ဘာကူညီပေးရမလဲ။",
    thanks: "ရပါတယ်။ နောက်ထပ်အကူအညီလိုပါက ပြောပေးပါ။",
    goodbye: "ဂရုစိုက်ပါ။ အကူအညီလိုသည့်အခါ အမြဲရှိနေပါမည်။",
    laughter: "ကူညီရန် ဒီမှာရှိပါသည်။ အဆင်သင့်ဖြစ်သည့်အခါ ဘာအကူအညီလိုသည်ကို ပြောပေးပါ။",
    boundary: "ကူညီရန် အသင့်ရှိသော်လည်း လေးစားစွာ ပြောဆိုပေးပါ။ ပြဿနာကို ရှင်းပြပါ၊ အကောင်းဆုံး ကူညီပေးပါမည်။",
    help: "ဤအကူအညီစင်တာတွင် ဖော်ပြထားသော အကြောင်းအရာများကို ကူညီနိုင်ပါသည်။ ပြဿနာ သို့မဟုတ် လိုချင်သောရလဒ်ကို ရှင်းပြပါ။",
    unknown: "အတည်ပြုထားသောအဖြေကို မတွေ့သေးပါ။ အသေးစိတ်အနည်းငယ် ထပ်ပြောပါ သို့မဟုတ် support ကို ဆက်သွယ်ပါ။",
    provider: "AI ဝန်ဆောင်မှုတွင် လက်ရှိပြဿနာရှိနေပါသည်။ အတည်ပြုထားသော support အချက်အလက်ကို အသုံးပြုနိုင်သေးသောကြောင့် မေးခွန်းကို ထပ်မံပို့ပါ သို့မဟုတ် support ကို ဆက်သွယ်ပါ။",
    support: "Support ကို ဆက်သွယ်ရန်",
    retry: "ထပ်ကြိုးစားရန်",
    online: "အွန်လိုင်းအကူ",
    welcome: (name) => `သင့်ပြဿနာကို ဖော်ပြပါ။ ${name} Support က အဆင့်ဆင့် လမ်းညွှန်ပေးပါမည်။`,
    welcomeTitle: (name) => `${name} Support မှ ကြိုဆိုပါသည်`,
    placeholder: "သင့်စာကို ရိုက်ထည့်ပါ...",
    busy: "လက်ရှိအဖြေကို စောင့်ပေးပါ...",
  },
};

function localeBase(value) {
  const base = String(value || "en").trim().toLowerCase().replace(/_/g, "-").split("-")[0];
  return Object.hasOwn(COPY, base) ? base : "en";
}

export function chatCopy(locale) {
  return COPY[localeBase(locale)];
}

function normalizedConversationText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}\s😂🤣]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function localConversationReply(message, locale) {
  const original = String(message || "");
  const text = normalizedConversationText(original);
  if (!text) return null;
  const copy = chatCopy(locale);
  const abusive = /\b(fuck|fucking|idiot|stupid|moron|bitch|asshole|dumb|retard|goblok|bodoh|bangsat|anjing|kontol|memek|tolol)\b/i.test(text);
  if (abusive) return { intent: "boundary", reply: copy.boundary };
  if (/^(hi|hello|hey|hiya|good morning|good afternoon|good evening|namaste|salam|halo|hai|selamat pagi|selamat siang|selamat sore|selamat malam|mingalaba|မင်္ဂလာပါ|你好|您好|嗨)$/.test(text)) return { intent: "greeting", reply: copy.greeting };
  if (/^(thanks|thank you|thankyou|thx|ty|terima kasih|makasih|धन्यवाद|शुक्रिया|谢谢|多谢|ကျေးဇူးတင်ပါတယ်)$/.test(text)) return { intent: "thanks", reply: copy.thanks };
  if (/^(bye|goodbye|see you|see ya|take care|dadah|sampai jumpa|再见|拜拜|अलविदा|फिर मिलेंगे|နောက်မှတွေ့မယ်)$/.test(text)) return { intent: "goodbye", reply: copy.goodbye };
  if (/^(lol|lmao|rofl|haha+|hehe+|wkwk+|xixi+|😂+|🤣+|😂🤣|🤣😂)$/.test(text)) return { intent: "laughter", reply: copy.laughter };
  if (/^(help|help me|can you help|bantu|tolong bantu|मदद|帮帮我|帮助|ကူညီပါ)$/.test(text)) return { intent: "help", reply: copy.help };
  return null;
}

function usableConfiguredReply(value) {
  const reply = String(value || "").trim().slice(0, 2000);
  if (!reply) return "";
  // Old releases stored a scary network-error sentence here. A successful
  // HTTP response with a safe fallback must never tell the customer that
  // their internet or the server connection failed.
  if (/(connecting to (?:the )?server|check your internet|internet connection|network connection)/i.test(reply)) return "";
  return reply;
}

export function reliabilityFallbackText(locale, reliability, kind = "provider") {
  const base = localeBase(locale);
  const configured = kind === "unknown"
    ? usableConfiguredReply(reliability?.unknown_reply)
    : usableConfiguredReply(reliability?.provider_error_reply);
  // Reliability reply fields are not locale-keyed. Use them for English only
  // instead of leaking an English fallback into every enabled locale.
  if (base === "en" && configured) return configured;
  return kind === "unknown" ? COPY[base].unknown : COPY[base].provider;
}

export function supportButtonLabel(locale) {
  return chatCopy(locale).support;
}

export function chatSystemText(locale, supportName) {
  const copy = chatCopy(locale);
  const name = String(supportName || "Support").trim() || "Support";
  return {
    online: copy.online,
    welcome: copy.welcome(name),
    welcome_title: copy.welcomeTitle(name),
    placeholder: copy.placeholder,
    busy: copy.busy,
  };
}

export function parseModelJsonText(value) {
  const raw = String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const candidates = [raw];
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(raw.slice(start, end + 1));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch {}
    // A trailing comma is a common harmless model formatting mistake. Repair
    // only that narrow case; never evaluate or execute model output.
    try { return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1")); } catch {}
  }
  return null;
}
