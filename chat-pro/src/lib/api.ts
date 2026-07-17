// BDG Chat Pro API client
// Chat Pro client for the v0.7.0 Render API. Configurable via VITE_BDG_API_BASE.

const configuredApiBase =
  (import.meta.env.VITE_BDG_API_BASE as string | undefined) ??
  (import.meta.env.VITE_API_BASE as string | undefined);
export const API_BASE = (
  configuredApiBase || (import.meta.env.DEV ? "http://localhost:10000" : "")
).replace(/\/$/, "");

export interface ChatContent {
  branding?: { chat_icon_url?: string; favicon_url?: string; brand_name?: string; title?: string; online?: string };
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
  default_platform_key?: string;
  platforms?: { platform_key: string; name: string; support_mode: "none" | "tickets" | "hybrid" }[];
}

export interface ChatSource {
  title?: string;
  url?: string;
}

export type RichSegment = { text: string; marks?: { bold?: boolean; italic?: boolean; underline?: boolean; color?: string; highlight?: string } };

export type ResponseBlock =
  | { type: "heading"; text: string; segments?: RichSegment[]; level?: 2 | 3 }
  | { type: "paragraph"; text: string; segments?: RichSegment[] }
  | { type: "steps" | "list"; title?: string; items: string[]; rich_items?: RichSegment[][]; ordered?: boolean }
  | { type: "warning" | "notice" | "success" | "error"; text: string }
  | { type: "link" | "button"; id?: number; label: string; subtitle?: string; url: string; icon_url?: string; target?: string; action_type?: string }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "divider" };

export interface ChatResponse {
  reply: string;
  content_images?: string[];
  sources?: ChatSource[];
  memory_note?: string;
  technical_failure?: boolean;
  response_format?: "structured-v1" | "structured-v2" | string;
  response_blocks?: ResponseBlock[];
  resolution_state?: "open" | "confirmed_by_user" | string;
}

export interface ChatRequest {
  message: string;
  session_id: string;
  image_urls: string[];
  language?: "en" | "hi";
  platform_key?: string;
}

const SESSION_KEY = "bdg_chat_session_id";

function platformReferenceFromLocation(): string {
  if (typeof window === "undefined") return "";
  const fromQuery = new URLSearchParams(window.location.search).get("platform");
  if (fromQuery) return fromQuery;
  return window.location.pathname.match(/^\/p\/([a-z0-9-]+)(?:\/|$)/i)?.[1] || "";
}

export function getSessionId(platformKey = getPlatformKey()): string {
  if (typeof window === "undefined") return "ssr";
  const key = `${SESSION_KEY}:${platformKey}`;
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = "guest_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    window.localStorage.setItem(key, id);
  }
  return id;
}

export function getPlatformKey(defaultKey = "default"): string {
  if (typeof window === "undefined") return defaultKey;
  const fromQuery = platformReferenceFromLocation();
  return String(fromQuery || defaultKey).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || defaultKey;
}

export async function sendChatMessage(
  message: string,
  language: "en" | "hi" = "en",
  platform_key = getPlatformKey(),
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const body: ChatRequest = {
    message,
    session_id: getSessionId(platform_key),
    image_urls: [],
    language,
    platform_key,
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

export async function fetchChatContent(platformKey = getPlatformKey(), signal?: AbortSignal): Promise<ChatContent> {
  if (!API_BASE)
    throw new Error(
      "Chat API is not configured. Set VITE_BDG_API_BASE during the Cloudflare Pages build.",
    );
  const timeoutSignal = AbortSignal.timeout(15000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const res = await fetch(`${API_BASE}/chat/content?platform=${encodeURIComponent(platformKey)}`, {
    signal: combinedSignal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Chat content API error: ${res.status}`);
  return (await res.json()) as ChatContent;
}
