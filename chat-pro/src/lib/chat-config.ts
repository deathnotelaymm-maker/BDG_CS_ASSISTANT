export type PublicLanguage = "en" | "hi";

export const CHAT_LANGUAGE_OPTIONS: { code: PublicLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
];

function platformLabel(platformKey = "default") {
  if (!platformKey || platformKey === "default") return "BDG";
  return platformKey
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Platform";
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
} as const;

export function getChatConfig(language: string, platformKey = "default") {
  const lang: PublicLanguage = language === "hi" ? "hi" : "en";
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
  if (isDefault) return { ...base, ...texts[lang], language: lang };
  const neutral = lang === "hi"
    ? {
        chatTitle: `${name} Support`,
        onlineLabel: "ऑनलाइन सहायक",
        supportLabel: "Support",
        welcomeTitle: `${name} Support में आपका स्वागत है`,
        welcomeText: "अपनी समस्या बताएं। हम आपको चरण-दर-चरण मार्गदर्शन देंगे।",
        quickQuestions: [],
        placeholderIdle: "अपना संदेश लिखें...",
        placeholderBusy: "कृपया वर्तमान उत्तर की प्रतीक्षा करें...",
        waitInlineNote: "कृपया वर्तमान उत्तर की प्रतीक्षा करें।",
        fallbackMessage: "इस प्लेटफ़ॉर्म की AI सहायता अभी उपलब्ध नहीं है। कृपया कुछ देर बाद फिर प्रयास करें।",
        replyingLabel: "AI जवाब दे रहा है...",
        languageLabel: "भाषा",
      }
    : {
        chatTitle: `${name} Support`,
        onlineLabel: "Online assistant",
        supportLabel: "Support",
        welcomeTitle: `Welcome to ${name} Support`,
        welcomeText: "Describe your issue and the platform support assistant will guide you step by step.",
        quickQuestions: [],
        placeholderIdle: "Type your message...",
        placeholderBusy: "Please wait for the current reply...",
        waitInlineNote: "Please wait for the current reply.",
        fallbackMessage: "This platform's AI support is temporarily unavailable. Please try again in a moment.",
        replyingLabel: "AI is replying...",
        languageLabel: "Language",
      };
  return { ...base, ...neutral, language: lang };
}
