export type PublicLanguage = "en" | "hi";

export const CHAT_LANGUAGE_OPTIONS: { code: PublicLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
];

const common = {
  supportUrl: "mailto:support@bdg.example",
  submitTicketLabel: "Submit Ticket / Contact Support",
};

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

export function getChatConfig(language: string) {
  const lang: PublicLanguage = language === "hi" ? "hi" : "en";
  return { ...common, ...texts[lang], language: lang };
}
