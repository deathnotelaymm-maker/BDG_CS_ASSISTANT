export type PublicLanguage = string;

export const CHAT_LANGUAGE_OPTIONS: { code: PublicLanguage; label: string }[] = [
  { code: "en", label: "English" },
];

export function normalizeChatLocale(value: string | undefined, fallback = "en"): PublicLanguage {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "all" || raw === "*") return fallback;
  return raw.replace(/_/g, "-");
}

function platformLabel(platformKey = "default") {
  if (!platformKey || platformKey === "default") return "BDG";
  // A route key is an implementation detail, not a customer-facing brand.
  // The real tenant name arrives from /chat/content after the route resolves.
  return "Platform";
}

const texts = {
  en: {
    chatTitle: "BDG AI Support",
    onlineLabel: "Online assistant",
    supportLabel: "Support",
    welcomeTitle: "Welcome to BDG AI Support",
    welcomeText:
      "Ask me anything about deposits, withdrawals, account, or bank binding. I’ll help you 24/7.",
    quickQuestions: [
      "How to withdraw?",
      "How to deposit?",
      "How to bind bank card?",
      "I cannot login",
      "Contact support",
    ],
    placeholderIdle: "Type your message...",
    placeholderBusy: "Please wait for the current reply...",
    waitInlineNote: "Please wait for the current reply.",
    fallbackMessage: "AI support is temporarily unavailable. Please try again in a moment.",
    replyingLabel: "AI is replying...",
    languageLabel: "Language",
  },
  hi: {
    chatTitle: "BDG AI Support",
    onlineLabel: "ऑनलाइन सहायक",
    supportLabel: "Support",
    welcomeTitle: "BDG AI Support में आपका स्वागत है",
    welcomeText:
      "Deposit, withdrawal, account या bank card से जुड़े सवाल पूछें। मैं 24/7 मदद करूँगा।",
    quickQuestions: [
      "Withdrawal कैसे करें?",
      "Deposit कैसे करें?",
      "Bank card कैसे bind करें?",
      "Login नहीं हो रहा",
      "Support से संपर्क करें",
    ],
    placeholderIdle: "अपना संदेश लिखें...",
    placeholderBusy: "कृपया वर्तमान उत्तर की प्रतीक्षा करें...",
    waitInlineNote: "कृपया वर्तमान उत्तर की प्रतीक्षा करें।",
    fallbackMessage: "AI सहायता अभी अस्थायी रूप से उपलब्ध नहीं है। कृपया कुछ देर बाद फिर प्रयास करें।",
    replyingLabel: "AI जवाब दे रहा है...",
    languageLabel: "भाषा",
  },
  id: {
    chatTitle: "Dukungan AI BDG",
    onlineLabel: "Asisten online",
    supportLabel: "Dukungan",
    welcomeTitle: "Selamat datang di Dukungan AI BDG",
    welcomeText: "Tanyakan tentang deposit, penarikan, akun, atau pengikatan rekening bank. Saya siap membantu 24/7.",
    quickQuestions: ["Bagaimana cara menarik dana?", "Bagaimana cara deposit?", "Bagaimana cara mengikat rekening bank?", "Saya tidak bisa masuk", "Hubungi dukungan"],
    placeholderIdle: "Ketik pesan Anda...",
    placeholderBusy: "Harap tunggu jawaban saat ini...",
    waitInlineNote: "Harap tunggu jawaban saat ini.",
    fallbackMessage: "Layanan sedang mengalami gangguan. Coba kirim ulang pertanyaan Anda atau hubungi dukungan.",
    replyingLabel: "AI sedang menjawab...",
    languageLabel: "Bahasa",
  },
  zh: {
    chatTitle: "BDG AI 支持",
    onlineLabel: "在线助手",
    supportLabel: "支持",
    welcomeTitle: "欢迎使用 BDG AI 支持",
    welcomeText: "您可以询问充值、提款、账户或银行卡绑定问题。我会全天候提供帮助。",
    quickQuestions: ["如何提款？", "如何充值？", "如何绑定银行卡？", "我无法登录", "联系支持"],
    placeholderIdle: "输入您的消息...",
    placeholderBusy: "请等待当前回复完成...",
    waitInlineNote: "请等待当前回复完成。",
    fallbackMessage: "服务目前遇到问题。请重新发送问题或联系支持团队。",
    replyingLabel: "AI 正在回复...",
    languageLabel: "语言",
  },
  my: {
    chatTitle: "BDG AI Support",
    onlineLabel: "အွန်လိုင်းအကူ",
    supportLabel: "Support",
    welcomeTitle: "BDG AI Support မှ ကြိုဆိုပါသည်",
    welcomeText: "Deposit၊ withdrawal၊ account သို့မဟုတ် bank ချိတ်ဆက်ခြင်းအကြောင်း မေးနိုင်ပါသည်။ 24/7 ကူညီပေးပါမည်။",
    quickQuestions: ["ငွေဘယ်လိုထုတ်မလဲ။", "Deposit ဘယ်လိုလုပ်မလဲ။", "Bank account ဘယ်လိုချိတ်မလဲ။", "Login မဝင်နိုင်ပါ", "Support ကို ဆက်သွယ်ရန်"],
    placeholderIdle: "သင့်စာကို ရိုက်ထည့်ပါ...",
    placeholderBusy: "လက်ရှိအဖြေကို စောင့်ပေးပါ...",
    waitInlineNote: "လက်ရှိအဖြေကို စောင့်ပေးပါ။",
    fallbackMessage: "ဝန်ဆောင်မှုတွင် လက်ရှိပြဿနာရှိနေပါသည်။ မေးခွန်းကို ထပ်မံပို့ပါ သို့မဟုတ် support ကို ဆက်သွယ်ပါ။",
    replyingLabel: "AI က အဖြေပေးနေသည်...",
    languageLabel: "ဘာသာစကား",
  },
} as const;

export function getChatConfig(language: string, platformKey = "default") {
  const lang: PublicLanguage = normalizeChatLocale(language);
  const baseLang = lang.split("-")[0];
  const isDefault = platformKey === "default";
  const name = platformLabel(platformKey);
  const base = isDefault
    ? {
        supportUrl: "mailto:support@bdg.example",
        submitTicketLabel: "Submit Ticket / Contact Support",
      }
    : {
        supportUrl: "",
        submitTicketLabel: "Contact platform support",
      };
  if (isDefault) return { ...base, ...(texts[baseLang as keyof typeof texts] || texts.en), language: lang };
  const selected = texts[baseLang as keyof typeof texts] || texts.en;
  const neutralCopy: Record<string, { welcomeTitle:string; welcomeText:string }> = {
    en: { welcomeTitle:`Welcome to ${name} Support`, welcomeText:"Describe your issue and the platform support assistant will guide you step by step." },
    id: { welcomeTitle:`Selamat datang di Dukungan ${name}`, welcomeText:"Jelaskan masalah Anda dan asisten dukungan akan memandu Anda langkah demi langkah." },
    hi: { welcomeTitle:`${name} Support में आपका स्वागत है`, welcomeText:"अपनी समस्या बताएं। सहायता टीम आपको चरण-दर-चरण मार्गदर्शन देगी।" },
    zh: { welcomeTitle:`欢迎使用 ${name} 支持`, welcomeText:"请描述您的问题，支持助手将逐步为您提供指导。" },
    my: { welcomeTitle:`${name} Support မှ ကြိုဆိုပါသည်`, welcomeText:"သင့်ပြဿနာကို ဖော်ပြပါ။ Support အကူက အဆင့်ဆင့် လမ်းညွှန်ပေးပါမည်။" },
  };
  const localized = neutralCopy[baseLang] || neutralCopy.en;
  const neutral = { ...selected, chatTitle:`${name} Support`, ...localized, quickQuestions:[] as string[] };
  return { ...base, ...neutral, language: lang };
}
