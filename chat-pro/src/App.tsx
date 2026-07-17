import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Languages,
  RefreshCw,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { ChatApiError, fetchChatContent, getPlatformKey, sendChatMessage, type ChatContent, type ResponseBlock } from "@/lib/api";
import { CHAT_LANGUAGE_OPTIONS, getChatConfig, normalizeChatLocale, type PublicLanguage } from "@/lib/chat-config";
import { ImageLightbox } from "@/components/ImageLightbox";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  images?: string[];
  blocks?: ResponseBlock[];
  error?: boolean;
  retryOf?: string;
  errorInfo?: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function cleanDisplayText(text: string) {
  return String(text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .trim();
}

const SAFE_ANIMATIONS = new Set(["none", "fade", "slide", "pulse", "typing"]);
const SAFE_LAYOUTS = new Set(["standard", "compact", "centered"]);
const SAFE_BUBBLES = new Set(["soft", "sharp", "minimal"]);
const SAFE_INPUTS = new Set(["rounded", "square", "minimal"]);

function safePreset(value: string | undefined, allowed: Set<string>, fallback: string) {
  const normalized = String(value || "").toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function safeVisualUrl(value: string | undefined) {
  const url = String(value || "").trim();
  return /^https:\/\//i.test(url) || /^\/uploads\//i.test(url) ? url : "";
}

function safeFontFamily(value: string | undefined) {
  const allowed: Record<string, string> = {
    inter: "Inter, ui-sans-serif, system-ui, sans-serif",
    system: "ui-sans-serif, system-ui, sans-serif",
    roboto: "Roboto, ui-sans-serif, system-ui, sans-serif",
    segoe: '"Segoe UI", ui-sans-serif, system-ui, sans-serif',
  };
  return allowed[String(value || "inter").toLowerCase()] || allowed.inter;
}

export default function App() {
  const [preview, setPreview] = useState<{ src:string; alt:string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [content, setContent] = useState<ChatContent | null>(null);
  const [language, setLanguage] = useState<PublicLanguage>(() => {
    if (typeof window === "undefined") return "en";
    return (window.localStorage.getItem("bdg_chat_language") as PublicLanguage) || "en";
  });
  const platformKey = getPlatformKey();
  const effectiveLanguage = normalizeChatLocale(language, normalizeChatLocale(content?.default_locale, "en"));
  const chatConfig = getChatConfig(effectiveLanguage, platformKey);
  const dynamicTexts = content?.texts?.[effectiveLanguage] || content?.texts?.[effectiveLanguage.split("-")[0]] || {};
  const startModule = content?.start_module;
  const languageOptions = content?.languages?.length ? content.languages : CHAT_LANGUAGE_OPTIONS;
  const startEnabled = Boolean(content && startModule?.enabled !== false);
  const [started, setStarted] = useState(false);
  const headerTitle = content?.branding?.title || dynamicTexts.title || chatConfig.chatTitle;
  const onlineText = content?.branding?.online || dynamicTexts.online || chatConfig.onlineLabel;
  const welcomeTitle = dynamicTexts.welcome_title || chatConfig.welcomeTitle;
  const welcomeText = dynamicTexts.welcome || chatConfig.welcomeText;
  const iconUrl = content?.branding?.chat_icon_url || "";
  const quickQuestions = content
    ? (content.quick_replies || []).slice(0, 5).map((q) => q.query || q.text)
    : chatConfig.quickQuestions;
  const actionButtons = content?.action_buttons || [];
  const layout = safePreset(startModule?.layout || content?.settings?.chat_layout, SAFE_LAYOUTS, "standard");
  const bubbleStyle = safePreset(startModule?.bubble_style || content?.settings?.chat_bubble_style, SAFE_BUBBLES, "soft");
  const inputStyle = safePreset(startModule?.input_style || content?.settings?.chat_input_style, SAFE_INPUTS, "rounded");
  const animation = safePreset(startModule?.animation, SAFE_ANIMATIONS, "fade");
  const backgroundUrl = safeVisualUrl(startModule?.background_url || content?.settings?.chat_background_url);
  const themeStyle = {
    "--brand": content?.settings?.accent_color || undefined,
    "--primary": content?.settings?.accent_color || undefined,
    "--ring": content?.settings?.accent_color || undefined,
    "--surface": content?.settings?.surface_color || undefined,
    "--background-image": backgroundUrl ? `url(${JSON.stringify(backgroundUrl)})` : undefined,
    fontFamily: safeFontFamily(content?.settings?.font_family),
  } as React.CSSProperties;

  const [isProcessing, setIsProcessing] = useState(false);
  const [waitHint, setWaitHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchChatContent(platformKey, controller.signal)
      .then(setContent)
      .catch(() => null);
    return () => controller.abort();
  }, [platformKey]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = `${headerTitle} — Chat`;
    document.querySelectorAll('link[data-platform-default-favicon="true"]').forEach((link) => {
      if (platformKey !== "default") link.remove();
    });
    const favicon = content?.branding?.favicon_url;
    const existing = document.querySelector<HTMLLinkElement>('link[data-platform-favicon="true"]');
    if (favicon) {
      const link = existing || document.createElement("link");
      link.rel = "icon";
      link.setAttribute("data-platform-favicon", "true");
      link.href = favicon;
      if (!existing) document.head.appendChild(link);
    } else if (existing) {
      existing.remove();
    }
  }, [content?.branding?.favicon_url, headerTitle, platformKey]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, scrollToBottom]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (isProcessing) {
        setWaitHint(true);
        setTimeout(() => setWaitHint(false), 2000);
        return;
      }

      setStarted(true);

      setMessages((m) => [...m, { id: uid(), role: "user", content: trimmed }]);
      setInput("");
      setIsProcessing(true);

      try {
        const res = await sendChatMessage(trimmed, effectiveLanguage, platformKey);
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: cleanDisplayText(res.reply || chatConfig.fallbackMessage),
            blocks: res.response_blocks || [],
            images: res.content_images || [],
          },
        ]);
      } catch (error) {
        const errorInfo = error instanceof ChatApiError
          ? `${error.message}${error.requestId ? ` · Request ${error.requestId}` : ""}`
          : "The support service did not return a usable response.";
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: chatConfig.fallbackMessage,
            error: true,
            retryOf: trimmed,
            errorInfo,
          },
        ]);
      } finally {
        setIsProcessing(false);
        setTimeout(() => inputRef.current?.focus(), 30);
      }
    },
    [isProcessing, effectiveLanguage, platformKey, chatConfig.fallbackMessage],
  );

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
    <div className="min-h-[100dvh] w-full bg-background flex justify-center" style={themeStyle}>
      <div className={`chat-layout-${layout} chat-bubbles-${bubbleStyle} chat-input-${inputStyle} flex flex-col w-full max-w-[440px] min-h-[100dvh] relative bg-background/95 ${backgroundUrl ? "chat-background-image" : ""}`}>
        <header className="sticky top-0 z-20 backdrop-blur-md bg-background/85 border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand text-brand-foreground grid place-items-center font-bold shadow-sm overflow-hidden">
                  {iconUrl ? (
                    <img src={iconUrl} alt={`${headerTitle} logo`} className="h-full w-full object-cover" />
                  ) : (
                    platformKey === "default" ? <Sparkles className="w-5 h-5" /> : <span className="text-xs font-bold">?</span>
                  )}
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
                  if (typeof window !== "undefined")
                    window.localStorage.setItem("bdg_chat_language", next);
                }}
                disabled={isProcessing}
                className="bg-transparent text-foreground outline-none"
                aria-label={chatConfig.languageLabel}
              >
                {languageOptions.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {startEnabled && !started ? (
            <ChatStartModule
              module={startModule}
              iconUrl={iconUrl}
              quickQuestions={quickQuestions}
              actionButtons={actionButtons}
              onStart={() => {
                setStarted(true);
                setTimeout(() => inputRef.current?.focus(), 30);
              }}
              onPrompt={send}
            />
          ) : (
            <>
              <section className="rounded-2xl bg-gradient-to-br from-surface-elevated to-surface border border-border p-4 msg-in">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0 overflow-hidden">
                    {iconUrl ? (
                      <img src={iconUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-sm">{welcomeTitle}</h2>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{welcomeText}</p>
                  </div>
                </div>
              </section>

            </>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onRetry={() => m.retryOf && send(m.retryOf)} onPrompt={send} onPreview={(src,alt)=>setPreview({src,alt})} />
          ))}
          {isProcessing && <TypingIndicator />}
        </div>

        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-md px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          {waitHint && (
            <div className="text-[11px] text-muted-foreground px-2 pb-1">
              {chatConfig.waitInlineNote}
            </div>
          )}
          {isProcessing && !waitHint && (
            <div className="text-[11px] text-brand/90 px-2 pb-1 flex items-center gap-1.5">
              <span className="typing-dot" />
              {chatConfig.replyingLabel}
            </div>
          )}
          {quickQuestions.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2" aria-label="Quick replies">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => send(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder={
                isProcessing
                  ? dynamicTexts.busy || chatConfig.placeholderBusy
                  : dynamicTexts.placeholder || chatConfig.placeholderIdle
              }
              className="flex-1 resize-none max-h-32 rounded-2xl bg-surface border border-border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 placeholder:text-muted-foreground"
              style={{ minHeight: "42px" }}
            />
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              aria-label="Send message"
              className="shrink-0 w-11 h-11 rounded-full bg-brand text-brand-foreground grid place-items-center hover:bg-brand-glow disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send className="w-4.5 h-4.5" strokeWidth={2.25} />
            </button>
          </div>
        </form>
      </div>
      {preview && <ImageLightbox src={preview.src} alt={preview.alt} onClose={()=>setPreview(null)} />}
    </div>
  );
}

function ChatStartModule({
  module,
  iconUrl,
  quickQuestions,
  actionButtons,
  onStart,
  onPrompt,
}: {
  module?: ChatContent["start_module"];
  iconUrl: string;
  quickQuestions: string[];
  actionButtons: NonNullable<ChatContent["action_buttons"]>;
  onStart: () => void;
  onPrompt: (text: string) => void;
}) {
  const imageUrl = safeVisualUrl(module?.image_url);
  const animation = safePreset(module?.animation, SAFE_ANIMATIONS, "fade");
  return (
    <section className={`chat-start-module chat-start-${animation} rounded-3xl border border-border bg-gradient-to-br from-surface-elevated to-surface p-5 msg-in`}>
      {module?.announcement ? (
        <div className="chat-announcement-window mb-3 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs text-sky-100">
          <span className="chat-announcement-track">{module.announcement}</span>
        </div>
      ) : null}
      {module?.maintenance_banner ? (
        <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          {module.maintenance_banner}
        </div>
      ) : null}
      {imageUrl ? (
        <img src={imageUrl} alt="" className="mb-4 max-h-48 w-full rounded-2xl object-cover border border-border" loading="eager" />
      ) : (
        <div className="mb-4 grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-brand/15 text-brand">
          {iconUrl ? <img src={iconUrl} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-7 w-7" />}
        </div>
      )}
      <h2 className="text-lg font-semibold tracking-tight">{module?.title || "Welcome"}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        <StartCopy text={module?.body || "Choose a quick topic or start a conversation."} />
      </p>
      {quickQuestions.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {quickQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onPrompt(question)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
            >
              {question}
            </button>
          ))}
        </div>
      ) : null}
      {actionButtons.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {actionButtons.slice(0, 6).map((button) => {
            const prompt = button.action_type === "chat_prompt" || button.url.startsWith("prompt:");
            if (prompt) return <button key={button.id} type="button" onClick={() => onPrompt(button.url.replace(/^prompt:/i, "").trim() || button.label)} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left text-xs hover:bg-accent"><span className="flex-1">{button.label}{button.subtitle ? <span className="block opacity-70">{button.subtitle}</span> : null}</span></button>;
            return <a key={button.id} href={button.url} target={button.target === "new_window" ? "_blank" : undefined} rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left text-xs hover:bg-accent">{button.icon_url ? <img src={button.icon_url} alt="" className="h-6 w-6 rounded object-contain" /> : null}<span className="flex-1">{button.label}{button.subtitle ? <span className="block opacity-70">{button.subtitle}</span> : null}</span><ExternalLink className="h-3.5 w-3.5" /></a>;
          })}
        </div>
      ) : null}
      {module?.responsible_notice ? (
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{module.responsible_notice}</p>
      ) : null}
      <button
        type="button"
        onClick={onStart}
        className="mt-5 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-glow"
      >
        {module?.button_label || "Start chat"}
      </button>
    </section>
  );
}

function StartCopy({ text }: { text: string }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|==[^=]+==)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("__") && part.endsWith("__")) return <strong key={index}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
        if (part.startsWith("==") && part.endsWith("==")) return <mark key={index} className="rounded bg-brand/20 px-1 text-brand">{part.slice(2, -2)}</mark>;
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function MessageBubble({ message, onRetry, onPrompt, onPreview }: { message: Message; onRetry: () => void; onPrompt: (text:string) => void; onPreview:(src:string,alt:string)=>void }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex msg-in ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser ? "bg-bubble-user text-bubble-user-foreground rounded-br-sm" : "bg-bubble-ai text-bubble-ai-foreground rounded-bl-sm border border-border"}`}
      >
        {message.blocks && message.blocks.length > 0 ? (
          <StructuredResponse blocks={message.blocks} onPrompt={onPrompt} onPreview={onPreview} />
        ) : (
          <div>{message.content}</div>
        )}
        {message.images && message.images.length > 0 && (
          <div className="mt-3 grid gap-2">
            {message.images.map((src, index) => (
              <button
                type="button"
                onClick={()=>onPreview(src,"AI support visual")}
                key={src + index}
                className="block overflow-hidden rounded-xl border border-border bg-surface-elevated/50"
              >
                <img
                  src={src}
                  alt="AI support visual"
                  className="w-full max-h-80 object-contain bg-black/15"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
        {message.error && (
          <div className="mt-3">
            {message.errorInfo && <div className="mb-2 text-[11px] text-red-200/80">{message.errorInfo}</div>}
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand text-brand-foreground hover:bg-brand-glow transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const textColors: Record<string,string> = { brand:"text-blue-300",accent:"text-amber-300",success:"text-emerald-300",warning:"text-amber-200",danger:"text-red-300",muted:"text-muted-foreground",default:"" };
const highlights: Record<string,string> = { brand:"bg-blue-400/20",accent:"bg-amber-300/25",success:"bg-emerald-400/20",warning:"bg-amber-400/20",danger:"bg-red-400/20",muted:"bg-white/10",default:"" };
function RichText({ segments, fallback }: { segments?: any[]; fallback:string }) {
  if (!segments?.length) return <>{fallback}</>;
  return <>{segments.map((segment,index)=><span key={index} className={`${segment.marks?.bold ? "font-bold" : ""} ${segment.marks?.italic ? "italic" : ""} ${segment.marks?.underline ? "underline" : ""} ${textColors[segment.marks?.color || "default"] || ""} ${highlights[segment.marks?.highlight || "default"] || ""}`}>{segment.text}</span>)}</>;
}
function StructuredResponse({ blocks, onPrompt, onPreview }: { blocks: ResponseBlock[]; onPrompt:(text:string)=>void; onPreview:(src:string,alt:string)=>void }) {
  return (
    <div className="space-y-3 whitespace-normal">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "heading") {
          return (
            <h3
              key={key}
              className={
                block.level === 3
                  ? "text-sm font-semibold"
                  : "text-base font-semibold tracking-tight"
              }
            >
              <RichText segments={block.segments} fallback={block.text} />
            </h3>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={key} className="whitespace-pre-wrap leading-relaxed">
              <RichText segments={block.segments} fallback={block.text} />
            </p>
          );
        }
        if (block.type === "steps" || block.type === "list") {
          return (
            <div key={key} className="rounded-xl border border-white/8 bg-black/10 p-3">
              {block.title ? (
                <div className="mb-2 text-xs font-semibold text-brand">{block.title}</div>
              ) : null}
              <ol className="space-y-2">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`} className="flex gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">
                      {itemIndex + 1}
                    </span>
                    <span className="min-w-0 flex-1 leading-relaxed"><RichText segments={block.rich_items?.[itemIndex]} fallback={item} /></span>
                  </li>
                ))}
              </ol>
            </div>
          );
        }
        if (["warning", "notice", "success", "error"].includes(block.type)) {
          const tone = block.type as "warning" | "notice" | "success" | "error";
          const styles = {
            warning: "border-amber-400/30 bg-amber-400/10 text-amber-100",
            notice: "border-sky-400/30 bg-sky-400/10 text-sky-100",
            success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
            error: "border-red-400/30 bg-red-400/10 text-red-100",
          };
          const Icon =
            tone === "warning"
              ? AlertTriangle
              : tone === "notice"
                ? Info
                : tone === "success"
                  ? CheckCircle2
                  : XCircle;
          return (
            <div key={key} className={`flex gap-2 rounded-xl border p-3 ${styles[tone]}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-relaxed">{block.text}</span>
            </div>
          );
        }
        if (block.type === "image") {
          return <figure key={key} className="overflow-hidden rounded-xl border border-border bg-black/10"><button type="button" className="block w-full cursor-zoom-in" onClick={()=>onPreview(block.url,block.alt || "Support visual")}><img src={block.url} alt={block.alt || "Support visual"} className="w-full max-h-96 object-contain" loading="lazy" /></button>{block.caption && <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{block.caption}</figcaption>}</figure>;
        }
        if (block.type === "link" || block.type === "button") {
          const isPrompt = block.action_type === "chat_prompt" || block.url.startsWith("prompt:");
          if (isPrompt) return <button key={key} type="button" onClick={()=>onPrompt(block.url.replace(/^prompt:/i,"").trim() || block.label)} className="flex w-full items-center gap-2 rounded-xl bg-brand px-3 py-2 text-left text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand-glow">{block.icon_url && <img src={block.icon_url} alt="" className="h-7 w-7 rounded-lg object-contain"/>}<span className="flex-1"><span className="block">{block.label}</span>{block.subtitle && <span className="mt-0.5 block font-normal opacity-75">{block.subtitle}</span>}</span></button>;
          return (
            <a
              key={key}
              href={block.url}
              target={block.target === "new_window" ? "_blank" : undefined}
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand-glow"
            >
              {block.icon_url && <img src={block.icon_url} alt="" className="h-5 w-5 rounded object-contain"/>}{block.label} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          );
        }
        return block.type === "divider" ? <hr key={key} className="border-border" /> : null;
      })}
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
