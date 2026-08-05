export type Staff = {
  id: number;
  display_name: string;
  email: string;
  availability_status: string;
  permissions: string[];
  max_active_conversations: number;
  must_change_password: boolean;
  platform_id: number;
  timezone?: string;
  use_platform_timezone?: boolean;
  personal_timezone_allowed?: boolean;
};

export type Conversation = {
  id: number;
  public_id: string;
  customer_identifier?: string;
  customer_display_name?: string;
  customer_locale?: string;
  status: string;
  control_mode: "AI" | "HUMAN" | "CLOSED" | string;
  handoff_reason?: string;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string;
  last_message?: string;
  last_message_at?: string;
  queue_entered_at?: string;
  created_at?: string;
  unread_count?: number;
  waiting_seconds?: number;
  last_message_sequence?: number;
  return_to_ai_on_resolve?: boolean;
  version?: number;
  last_customer_read_sequence?: number;
  last_staff_read_sequence?: number;
};

export type SupportMessage = {
  id: number;
  public_id: string;
  conversation_id?: number;
  client_message_id?: string;
  ai_job_id?: number | null;
  message_sequence: number;
  sender_type: "CUSTOMER" | "AI" | "STAFF" | "SYSTEM";
  sender_name?: string;
  body_text: string;
  is_internal?: boolean;
  delivered_at?: string;
  read_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type ConversationDetail = {
  conversation: Conversation;
  messages: SupportMessage[];
  notes: Array<{ id: number; note_text: string; author_name?: string; created_at?: string }>;
  transfers: Array<Record<string, unknown>>;
};

export type StaffSettings = {
  platform_timezone: string;
  heartbeat_interval_seconds: number;
  offline_timeout_seconds?: number;
  allow_staff_timezone_override?: boolean;
  return_to_ai_on_resolve?: boolean;
  realtime_poll_interval_ms?: number;
};

const API = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "bdg_support_staff_token";
export const token = () => localStorage.getItem(TOKEN_KEY) || "";
export const saveToken = (value: string) => value ? localStorage.setItem(TOKEN_KEY, value) : localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, init: RequestInit = {}) {
  if (!API) throw new Error("Staff API is not configured. Set VITE_API_BASE_URL during the production build.");
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  const response = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
  return data as T;
}

export const api = {
  login: (email: string, password: string) => request<{ access_token: string; staff: Staff }>("/staff/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<{ staff: Staff; settings: StaffSettings }>("/staff/me"),
  logout: () => request("/staff/logout", { method: "POST" }),
  presence: (status: "active" | "invisible") => request("/staff/presence", { method: "PUT", body: JSON.stringify({ status }) }),
  heartbeat: (status: string) => request("/staff/heartbeat", { method: "POST", body: JSON.stringify({ status }) }),
  preferences: (data: { use_platform_timezone: boolean; timezone?: string }) => request("/staff/me/preferences", { method: "PUT", body: JSON.stringify(data) }),
  conversations: (tab: string) => request<Conversation[]>(`/staff/conversations?tab=${encodeURIComponent(tab)}`),
  conversation: (id: number) => request<ConversationDetail>(`/staff/conversations/${id}`),
  accept: (id: number) => request<{ conversation: Conversation }>(`/staff/conversations/${id}/accept`, { method: "POST" }),
  reply: (id: number, message: string, clientMessageId = crypto.randomUUID()) => request<{ message: SupportMessage }>(`/staff/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ message, client_message_id: clientMessageId }) }),
  note: (id: number, note: string) => request(`/staff/conversations/${id}/notes`, { method: "POST", body: JSON.stringify({ note }) }),
  resolve: (id: number) => request<{ conversation: Conversation; return_to_ai?: boolean }>(`/staff/conversations/${id}/resolve`, { method: "POST" }),
  reopen: (id: number) => request<{ conversation: Conversation }>(`/staff/conversations/${id}/reopen`, { method: "POST" }),
  online: () => request<Staff[]>("/staff/online"),
  transfer: (id: number, target_staff_id: number, reason: string) => request(`/staff/conversations/${id}/transfer`, { method: "POST", body: JSON.stringify({ target_staff_id, reason }) }),
  transfers: (status = "requested") => request<Array<Record<string, unknown>>>(`/staff/transfers?status=${encodeURIComponent(status)}`),
  transferDecision: (id: number, action: "accept" | "reject") => request(`/staff/transfers/${id}/${action}`, { method: "POST" }),
  changePassword: (password: string) => request("/staff/me/password", { method: "POST", body: JSON.stringify({ password }) }),
  performance: (period: "day" | "week" | "month" = "day") => request<Record<string, unknown>>(`/staff/performance?period=${period}`),
  realtimeTicket: () => request<{ ticket: string; expires_at: string }>("/staff/realtime-ticket", { method: "POST", body: "{}" }),
  sync: (id: number, afterSequence = 0) => request<{ conversation: Conversation; messages: SupportMessage[]; active_ai_jobs?: Array<{ id:number; status:string }>; poll_interval_ms?: number }>(`/staff/conversations/${id}/sync?after_sequence=${Math.max(0,Number(afterSequence || 0))}`),
};

export function websocketUrl(ticket = "") {
  const base = API || location.origin;
  const url = new URL(base, location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/support";
  url.search = ticket ? `?ticket=${encodeURIComponent(ticket)}` : "";
  return url.toString();
}
