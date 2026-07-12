import { useEffect, useRef, useState, useCallback } from "react";
import { Languages, Send, Sparkles, RefreshCw } from "lucide-react";
import { fetchChatContent, sendChatMessage, type ChatContent } from "@/lib/api";
import { CHAT_LANGUAGE_OPTIONS, getChatConfig, type PublicLanguage } from "@/lib/chat-config";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  images?: string[];
  smartMatchName?: string;
  error?: boolean;
  retryOf?: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function cleanDisplayText(text: string) {
  return String(text || "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1").trim();
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [content, setContent] = useState<ChatContent | null>(null);
  const [language, setLanguage] = useState<PublicLanguage>(() => {
    if (typeof window === "undefined") return "en";
    return (window.localStorage.getItem("bdg_chat_language") as PublicLanguage) || "en";
  });
  const chatConfig = getChatConfig(language);
  const dynamicTexts = content?.texts?.[language] || {};
  const headerTitle = content?.branding?.title || dynamicTexts.title || chatConfig.chatTitle;
  const onlineText = content?.branding?.online || dynamicTexts.online || chatConfig.onlineLabel;
  const welcomeTitle = dynamicTexts.welcome_title || chatConfig.welcomeTitle;
  const welcomeText = dynamicTexts.welcome || chatConfig.welcomeText;
  const iconUrl = content?.branding?.chat_icon_url || "";
  const quickQuestions = (content?.quick_replies || []).length
    ? (content?.quick_replies || []).slice(0, 5).map((q) => q.query || q.text)
    : chatConfig.quickQuestions;

  const [isProcessing, setIsProcessing] = useState(false);
  const [waitHint, setWaitHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchChatContent(controller.signal).then(setContent).catch(() => null);
    return () => controller.abort();
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }));
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isProcessing, scrollToBottom]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (isProcessing) {
      setWaitHint(true);
      setTimeout(() => setWaitHint(false), 2000);
      return;
    }

    setMessages((m) => [...m, { id: uid(), role: "user", content: trimmed }]);
    setInput("");
    setIsProcessing(true);

    try {
      const res = await sendChatMessage(trimmed, language);
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content: cleanDisplayText(res.reply || chatConfig.fallbackMessage),
          images: res.guide_images || [],
          smartMatchName: res.smart_match?.name,
        },
      ]);
    } catch {
      setMessages((m) => [...m, { id: uid(), role: "assistant", content: chatConfig.fallbackMessage, error: true, retryOf: trimmed }]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isProcessing, language, chatConfig.fallbackMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex justify-center">
      <div className="flex flex-col w-full max-w-[440px] min-h-[100dvh] relative">
        <header className="sticky top-0 z-20 backdrop-blur-md bg-background/85 border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand text-brand-foreground grid place-items-center font-bold shadow-sm overflow-hidden">
                  {iconUrl ? <img src={iconUrl} alt="BDG AI" className="h-full w-full object-cover" /> : <Sparkles className="w-5 h-5" />}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{headerTitle}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {onlineText}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 text-[11px] text-muted-foreground">
              <Languages className="h-3.5 w-3.5" />
              <select
                value={language}
                onChange={(e) => {
                  const next = e.target.value as PublicLanguage;
                  setLanguage(next);
                  if (typeof window !== "undefined") window.localStorage.setItem("bdg_chat_language", next);
                }}
                disabled={isProcessing}
                className="bg-transparent text-foreground outline-none"
                aria-label={chatConfig.languageLabel}
              >
                {CHAT_LANGUAGE_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
          </div>
        </header>

        <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <section className="rounded-2xl bg-gradient-to-br from-surface-elevated to-surface border border-border p-4 msg-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0 overflow-hidden">
                {iconUrl ? <img src={iconUrl} alt="" className="h-full w-full object-cover" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm">{welcomeTitle}</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{welcomeText}</p>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-2 pb-1">
            {quickQuestions.map((q) => (
              <button key={q} type="button" disabled={isProcessing} onClick={() => send(q)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {q}
              </button>
            ))}
          </div>

          {messages.map((m) => <MessageBubble key={m.id} message={m} onRetry={() => m.retryOf && send(m.retryOf)} />)}
          {isProcessing && <TypingIndicator />}
        </div>

        <form onSubmit={handleSubmit} className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-md px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {waitHint && <div className="text-[11px] text-muted-foreground px-2 pb-1">{chatConfig.waitInlineNote}</div>}
          {isProcessing && !waitHint && <div className="text-[11px] text-brand/90 px-2 pb-1 flex items-center gap-1.5"><span className="typing-dot" />{chatConfig.replyingLabel}</div>}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder={isProcessing ? (dynamicTexts.busy || chatConfig.placeholderBusy) : (dynamicTexts.placeholder || chatConfig.placeholderIdle)}
              className="flex-1 resize-none max-h-32 rounded-2xl bg-surface border border-border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 placeholder:text-muted-foreground"
              style={{ minHeight: "42px" }}
            />
            <button type="submit" disabled={isProcessing || !input.trim()} aria-label="Send message" className="shrink-0 w-11 h-11 rounded-full bg-brand text-brand-foreground grid place-items-center hover:bg-brand-glow disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
              <Send className="w-4.5 h-4.5" strokeWidth={2.25} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message, onRetry }: { message: Message; onRetry: () => void }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex msg-in ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser ? "bg-bubble-user text-bubble-user-foreground rounded-br-sm" : "bg-bubble-ai text-bubble-ai-foreground rounded-bl-sm border border-border"}`}>
        <div>{message.content}</div>
        {message.images && message.images.length > 0 && (
          <div className="mt-3 grid gap-2">
            {message.images.map((src, index) => (
              <a href={src} target="_blank" rel="noreferrer" key={src + index} className="block overflow-hidden rounded-xl border border-border bg-surface-elevated/50">
                <img src={src} alt="Guide screenshot" className="w-full max-h-80 object-contain bg-black/15" loading="lazy" />
              </a>
            ))}
          </div>
        )}
        {message.error && (
          <div className="mt-3">
            <button onClick={onRetry} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand text-brand-foreground hover:bg-brand-glow transition-colors">
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start msg-in">
      <div className="bg-bubble-ai border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        <span className="typing-dot" style={{ animationDelay: "0ms" }} />
        <span className="typing-dot" style={{ animationDelay: "150ms" }} />
        <span className="typing-dot" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
