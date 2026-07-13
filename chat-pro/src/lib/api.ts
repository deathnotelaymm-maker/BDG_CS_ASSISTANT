// BDG Chat Pro API client
// Chat Pro client for the v0.7.0 Render API. Configurable via VITE_BDG_API_BASE.

const configuredApiBase =
  (import.meta.env.VITE_BDG_API_BASE as string | undefined) ??
  (import.meta.env.VITE_API_BASE as string | undefined);
export const API_BASE = (
  configuredApiBase || (import.meta.env.DEV ? "http://localhost:10000" : "")
).replace(/\/$/, "");

export interface MatchedGuide {
  id?: string;
  title: string;
  summary?: string;
  url?: string;
  thumbnail?: string;
}

export interface SmartMatchGuide {
  id?: string | number;
  name: string;
  slug: string;
  confidence?: number;
  reason?: string;
}

export interface ChatContent {
  branding?: { chat_icon_url?: string; title?: string; online?: string };
  texts?: Record<
    string,
    {
      title?: string;
      online?: string;
      welcome?: string;
      welcome_title?: string;
      placeholder?: string;
      busy?: string;
    }
  >;
  quick_replies?: { text: string; query?: string }[];
  support_enabled?: boolean;
}

export interface ChatSource {
  title?: string;
  url?: string;
}

export type ResponseBlock =
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "steps"; title?: string; items: string[] }
  | { type: "warning" | "notice" | "success" | "error"; text: string }
  | { type: "link"; label: string; url: string }
  | { type: "divider" };

export interface ChatResponse {
  reply: string;
  matched_guides?: MatchedGuide[];
  smart_match?: SmartMatchGuide | null;
  guide_images?: string[];
  sources?: ChatSource[];
  memory_note?: string;
  fallback?: boolean;
  response_format?: "structured-v1" | string;
  response_blocks?: ResponseBlock[];
  resolution_state?: "open" | "confirmed_by_user" | string;
}

export interface ChatRequest {
  message: string;
  session_id: string;
  image_urls: string[];
  language?: "en" | "hi";
}

const SESSION_KEY = "bdg_chat_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = "guest_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function sendChatMessage(
  message: string,
  language: "en" | "hi" = "en",
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const body: ChatRequest = {
    message,
    session_id: getSessionId(),
    image_urls: [],
    language,
  };

  if (!API_BASE)
    throw new Error(
      "Chat API is not configured. Set VITE_BDG_API_BASE during the Cloudflare Pages build.",
    );
  const timeoutSignal = AbortSignal.timeout(25000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: combinedSignal,
  });

  if (!res.ok) {
    throw new Error(`Chat API error: ${res.status}`);
  }

  return (await res.json()) as ChatResponse;
}

export async function fetchChatContent(signal?: AbortSignal): Promise<ChatContent> {
  if (!API_BASE)
    throw new Error(
      "Chat API is not configured. Set VITE_BDG_API_BASE during the Cloudflare Pages build.",
    );
  const timeoutSignal = AbortSignal.timeout(15000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const res = await fetch(`${API_BASE}/chat/content`, {
    signal: combinedSignal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Chat content API error: ${res.status}`);
  return (await res.json()) as ChatContent;
}
