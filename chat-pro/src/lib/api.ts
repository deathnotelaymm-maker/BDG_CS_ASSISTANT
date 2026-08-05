// BDG Chat Pro API client — v1.16.3 single-pending flow and progressive history.

const configuredApiBase =
  (import.meta.env.VITE_BDG_API_BASE as string | undefined) ??
  (import.meta.env.VITE_API_BASE as string | undefined);
export const API_BASE = (
  configuredApiBase || (import.meta.env.DEV ? "http://localhost:10000" : "")
).replace(/\/$/, "");

export interface ChatContent {
  branding?: { chat_icon_url?: string; favicon_url?: string; brand_name?: string; title?: string; online?: string };
  settings?: {
    accent_color?: string;
    surface_color?: string;
    font_family?: string;
    chat_background_url?: string;
    chat_layout?: "standard" | "compact" | "centered" | string;
    chat_bubble_style?: "soft" | "sharp" | "minimal" | string;
    chat_input_style?: "rounded" | "square" | "minimal" | string;
  };
  start_module?: {
    enabled?: boolean;
    title?: string;
    body?: string;
    image_url?: string;
    animation?: "none" | "fade" | "slide" | "pulse" | "typing" | string;
    button_label?: string;
    announcement?: string;
    maintenance_banner?: string;
    responsible_notice?: string;
    layout?: "standard" | "compact" | "centered" | string;
    bubble_style?: "soft" | "sharp" | "minimal" | string;
    input_style?: "rounded" | "square" | "minimal" | string;
    background_url?: string;
  };
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
  quick_replies?: { text: string; query?: string; lifecycle_mode?: "one_time" | "persistent" | string }[];
  action_buttons?: { id: number; label: string; subtitle?: string; url: string; icon_url?: string; target?: string; action_type?: string }[];
  languages?: { code: string; label: string }[];
  default_locale?: string;
  support_enabled?: boolean;
  default_platform_key?: string;
  platforms?: { platform_key: string; name: string; support_mode: "none" | "tickets" | "hybrid" }[];
}

export interface ChatSource { title?: string; url?: string }
export type RichSegment = { text: string; marks?: { bold?: boolean; italic?: boolean; underline?: boolean; color?: string; highlight?: string } };
export type ResponseBlock =
  | { type: "heading"; text: string; segments?: RichSegment[]; level?: 2 | 3 }
  | { type: "paragraph"; text: string; segments?: RichSegment[] }
  | { type: "steps" | "list"; title?: string; items: string[]; rich_items?: RichSegment[][]; ordered?: boolean }
  | { type: "warning" | "notice" | "success" | "error"; text: string }
  | { type: "link" | "button"; id?: number | string; label: string; subtitle?: string; url: string; icon_url?: string; target?: string; action_type?: string }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "divider" };

export interface ProcessingExperience {
  enabled: boolean;
  message?: string;
  secondary_message?: string;
  show_after_ms?: number;
  secondary_after_ms?: number;
  max_visible_ms?: number;
  allow_additional_messages?: boolean;
}

export interface AiJobSummary {
  id: number;
  public_id?: string;
  status: "QUEUED" | "PROCESSING" | "RETRYING" | "COMPLETED" | "FAILED" | "CANCELLED" | "SUPPRESSED" | string;
  attempt_count?: number;
  created_at?: string;
  started_at?: string;
  processing?: ProcessingExperience;
}

export interface SupportMessage {
  id: number;
  public_id: string;
  conversation_id?: number;
  client_message_id?: string;
  ai_job_id?: number | null;
  message_sequence: number;
  sender_type: "CUSTOMER" | "AI" | "STAFF" | "SYSTEM";
  sender_name?: string;
  message_type?: string;
  body_text: string;
  is_internal?: boolean;
  delivered_at?: string;
  read_at?: string;
  metadata?: {
    response_blocks?: ResponseBlock[];
    content_images?: string[];
    human_support?: { enabled?: boolean; offered?: boolean; active?: boolean; button_text?: string };
    [key: string]: unknown;
  };
  created_at: string;
}

export interface SupportConversation {
  id: number;
  public_id: string;
  status: string;
  control_mode: "AI" | "HUMAN" | "CLOSED" | string;
  handoff_reason?: string;
  assigned_staff_name?: string;
  assigned_staff_id?: number | null;
  last_message_sequence?: number;
  return_to_ai_on_resolve?: boolean;
  version?: number;
  last_customer_read_sequence?: number;
  last_staff_read_sequence?: number;
}

export interface ChatAcceptedResponse {
  ok: true;
  accepted: true;
  duplicate?: boolean;
  message_id: number;
  client_message_id: string;
  status: string;
  mode: "AI_PROCESSING" | "HUMAN" | string;
  session_id: string;
  conversation: SupportConversation;
  message: SupportMessage;
  ai_job?: AiJobSummary | null;
  processing?: ProcessingExperience;
  support_token: string;
  human_support?: { enabled: boolean; active?: boolean; offered?: boolean };
  resume_key?: string;
  poll_interval_ms?: number;
}

export class ChatApiError extends Error {
  status: number;
  code: string;
  requestId: string;
  retryAfterMs?: number;
  constructor(message: string, details: { status: number; code?: string; requestId?: string; retryAfterMs?: number }) {
    super(message);
    this.name = "ChatApiError";
    this.status = details.status;
    this.code = details.code || "CHAT_REQUEST_FAILED";
    this.requestId = details.requestId || "";
    this.retryAfterMs = details.retryAfterMs;
  }
}

export interface ChatRequest {
  message: string;
  session_id: string;
  client_message_id: string;
  image_urls: string[];
  language?: string;
  platform_key?: string;
}

const SESSION_KEY = "bdg_chat_session_id";
const SUPPORT_TOKEN_KEY = "bdg_customer_support_token";
const SUPPORT_CONVERSATION_KEY = "bdg_customer_support_conversation";
const SUPPORT_RESUME_KEY = "bdg_customer_support_resume_key";

function platformReferenceFromLocation(): string {
  if (typeof window === "undefined") return "";
  const fromQuery = new URLSearchParams(window.location.search).get("platform");
  if (fromQuery) return fromQuery;
  return window.location.pathname.match(/^\/p\/([a-z0-9-]+)(?:\/|$)/i)?.[1] || "";
}

export function getPlatformKey(defaultKey = "default"): string {
  if (typeof window === "undefined") return defaultKey;
  const fromQuery = platformReferenceFromLocation();
  return String(fromQuery || defaultKey).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || defaultKey;
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

function requireApiBase() {
  if (!API_BASE) throw new Error("Chat API is not configured. Set VITE_BDG_API_BASE during the Cloudflare Pages build.");
}

function supportStorageKey(base: string, platformKey = getPlatformKey()) {
  const normalized = String(platformKey || "default").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "default";
  return `${base}:${normalized}`;
}

export function saveCustomerSupportSession(token: string, publicId: string, platformKey = getPlatformKey(), resumeKey = "") {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(supportStorageKey(SUPPORT_TOKEN_KEY, platformKey), token);
  if (publicId) localStorage.setItem(supportStorageKey(SUPPORT_CONVERSATION_KEY, platformKey), publicId);
  if (resumeKey) localStorage.setItem(supportStorageKey(SUPPORT_RESUME_KEY, platformKey), resumeKey);
}

export function getCustomerSupportSession(platformKey = getPlatformKey()) {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(supportStorageKey(SUPPORT_TOKEN_KEY, platformKey));
  const publicId = localStorage.getItem(supportStorageKey(SUPPORT_CONVERSATION_KEY, platformKey));
  const resumeKey = localStorage.getItem(supportStorageKey(SUPPORT_RESUME_KEY, platformKey)) || "";
  return publicId && (token || resumeKey) ? { token: token || "", publicId, resumeKey } : null;
}

export function clearCustomerSupportSession(platformKey = getPlatformKey()) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(supportStorageKey(SUPPORT_TOKEN_KEY, platformKey));
  localStorage.removeItem(supportStorageKey(SUPPORT_CONVERSATION_KEY, platformKey));
  localStorage.removeItem(supportStorageKey(SUPPORT_RESUME_KEY, platformKey));
}

export async function sendChatMessage(
  message: string,
  language = "en",
  platformKey = getPlatformKey(),
  clientMessageId = crypto.randomUUID(),
  signal?: AbortSignal,
): Promise<ChatAcceptedResponse> {
  requireApiBase();
  const body: ChatRequest = {
    message,
    session_id: getSessionId(platformKey),
    client_message_id: clientMessageId,
    image_urls: [],
    language,
    platform_key: platformKey,
  };
  const timeoutSignal = AbortSignal.timeout(15000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: combinedSignal,
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    throw new ChatApiError(String(payload.error || `Chat API error: ${res.status}`), {
      status: res.status,
      code: String(payload.code || ""),
      requestId: String(payload.request_id || res.headers.get("x-request-id") || ""),
      retryAfterMs: Number(payload.retry_after_ms || 0) || undefined,
    });
  }
  const accepted = payload as unknown as ChatAcceptedResponse;
  if (!accepted.accepted || !accepted.support_token || !accepted.conversation?.public_id) {
    throw new ChatApiError("Chat service returned an incomplete async response", {
      status: 502,
      code: "CHAT_ASYNC_RESPONSE_INVALID",
      requestId: res.headers.get("x-request-id") || "",
    });
  }
  saveCustomerSupportSession(accepted.support_token, accepted.conversation.public_id, platformKey, accepted.resume_key || "");
  return accepted;
}

export async function fetchChatContent(platformKey = getPlatformKey(), signal?: AbortSignal): Promise<ChatContent> {
  requireApiBase();
  const timeoutSignal = AbortSignal.timeout(15000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const res = await fetch(`${API_BASE}/chat/content?platform=${encodeURIComponent(platformKey)}`, {
    signal: combinedSignal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Chat content API error: ${res.status}`);
  return (await res.json()) as ChatContent;
}

async function supportRequest<T>(path: string, init: RequestInit = {}, supportToken?: string) {
  requireApiBase();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (supportToken) headers.set("Authorization", `Bearer ${supportToken}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  const body = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) throw new ChatApiError(String((body as any)?.error || (body as any)?.message || `Support request failed (${res.status})`), {
    status: res.status,
    code: String((body as any)?.code || "SUPPORT_REQUEST_FAILED"),
    requestId: String((body as any)?.request_id || res.headers.get("x-request-id") || ""),
  });
  return body as T;
}

export async function requestHumanSupport(platformKey: string, language: string, handoffReason?: string) {
  const res = await supportRequest<{ support_token: string; resume_key?: string; poll_interval_ms?: number; conversation: SupportConversation; message: string }>(
    `/support/handoff?platform=${encodeURIComponent(platformKey)}`,
    {
      method: "POST",
      body: JSON.stringify({
        session_id: getSessionId(platformKey),
        language,
        handoff_reason: handoffReason || "CUSTOMER_REQUESTED_HUMAN",
      }),
    },
  );
  saveCustomerSupportSession(res.support_token, res.conversation.public_id, platformKey, (res as any).resume_key || "");
  return res;
}

export async function fetchCustomerSupport(publicId: string, supportToken: string) {
  return supportRequest<{ conversation: SupportConversation; messages: SupportMessage[]; notes?: unknown[]; transfers?: unknown[] }>(
    `/support/customer/conversations/${publicId}`,
    {},
    supportToken,
  );
}

export async function sendCustomerSupportMessage(
  publicId: string,
  supportToken: string,
  message: string,
  clientMessageId = crypto.randomUUID(),
) {
  return supportRequest<{ message: SupportMessage }>(
    `/support/customer/conversations/${publicId}/messages`,
    { method: "POST", body: JSON.stringify({ message, client_message_id: clientMessageId }) },
    supportToken,
  );
}


export async function resumeCustomerConversation(platformKey = getPlatformKey()) {
  const saved = getCustomerSupportSession(platformKey);
  if (!saved) throw new ChatApiError("No saved conversation is available", { status: 404, code: "SUPPORT_RESUME_NOT_FOUND" });
  const response = await supportRequest<{
    ok: true;
    conversation: SupportConversation;
    messages: SupportMessage[];
    has_older_messages?: boolean;
    oldest_sequence?: number;
    active_ai_jobs?: AiJobSummary[];
    support_token: string;
    resume_key: string;
    poll_interval_ms?: number;
  }>(`/support/customer/resume?platform=${encodeURIComponent(platformKey)}`, {
    method: "POST",
    body: JSON.stringify({ session_id: getSessionId(platformKey), resume_key: saved.resumeKey || "" }),
  }, saved.token || undefined);
  saveCustomerSupportSession(response.support_token, response.conversation.public_id, platformKey, response.resume_key);
  return response;
}


export async function fetchOlderCustomerMessages(publicId: string, supportToken: string, beforeSequence: number, limit = 10) {
  return supportRequest<{ ok:true; messages:SupportMessage[]; has_older_messages:boolean; oldest_sequence:number }>(`/support/customer/conversations/${publicId}/history?before_sequence=${Math.max(0,Number(beforeSequence||0))}&limit=${Math.max(5,Math.min(50,Number(limit||10)))}`,{},supportToken);
}

export async function createCustomerRealtimeTicket(supportToken: string) {
  return supportRequest<{ ok: true; ticket: string; expires_at: string }>("/support/customer/realtime-ticket", { method: "POST", body: "{}" }, supportToken);
}

export async function syncCustomerSupport(publicId: string, supportToken: string, afterSequence = 0) {
  return supportRequest<{
    ok: true;
    conversation: SupportConversation;
    messages: SupportMessage[];
    active_ai_job?: AiJobSummary | null;
    active_ai_jobs?: AiJobSummary[];
    poll_interval_ms?: number;
  }>(`/support/customer/conversations/${publicId}/sync?after_sequence=${Math.max(0, Number(afterSequence || 0))}`, {}, supportToken);
}

export async function cancelCustomerHandoff(publicId: string, supportToken: string) {
  return supportRequest<{ ok: true; conversation: SupportConversation; return_to_ai: boolean }>(
    `/support/customer/conversations/${publicId}/cancel-handoff`,
    { method: "POST", body: "{}" },
    supportToken,
  );
}

export function supportWebSocketUrl(ticket = "") {
  const u = new URL(API_BASE || location.origin, location.origin);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/support";
  u.search = ticket ? `?ticket=${encodeURIComponent(ticket)}` : "";
  return u.toString();
}
