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
  message_type?: string;
  body_text: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_content_type?: string;
  attachment_size_bytes?: number;
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
  customer_attachments_enabled?: boolean;
  staff_attachments_enabled?: boolean;
  attachment_max_bytes?: number;
  attachment_allowed_types?: string[];
};

const API = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "luke_support_staff_token";
export function getStaffPlatformRoute(){
  if(typeof window==="undefined") return "";
  return window.location.pathname.match(/^\/p\/([a-z0-9-]+)(?:\/|$)/i)?.[1] || "";
}
function tokenKey(){ const route=getStaffPlatformRoute(); return route ? `${TOKEN_KEY}:${route}` : TOKEN_KEY; }
export const token = () => localStorage.getItem(tokenKey()) || localStorage.getItem("bdg_support_staff_token") || "";
export const saveToken = (value: string) => value ? localStorage.setItem(tokenKey(), value) : (localStorage.removeItem(tokenKey()),localStorage.removeItem("bdg_support_staff_token"));
function platformHeaders(){ const route=getStaffPlatformRoute(); return route ? { "X-BDG-Platform-Route": route } : {}; }

async function request<T>(path: string, init: RequestInit = {}) {
  if (!API) throw new Error("Staff API is not configured. Set VITE_API_BASE_URL during the production build.");
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  for(const [key,value] of Object.entries(platformHeaders())) headers.set(key,value);
  const response = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
  return data as T;
}


async function uploadRequest<T>(path: string, file: File, caption = "") {
  if (!API) throw new Error("Staff API is not configured. Set VITE_API_BASE_URL during the production build.");
  const body = new FormData();
  body.append("file", file);
  body.append("client_message_id", crypto.randomUUID());
  if (caption) body.append("caption", caption);
  const response = await fetch(`${API}${path}`, { method: "POST", headers: { ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...platformHeaders() }, body, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || `Upload failed (${response.status})`);
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
  quickReplies: () => request<Array<{ id:number; scope_kind:string; title:string; shortcut?:string; category:string; message_text:string }>>("/staff/quick-replies"),
  createQuickReply: (data: { title:string; shortcut?:string; category?:string; message_text:string }) => request("/staff/quick-replies", { method: "POST", body: JSON.stringify(data) }),
  deleteQuickReply: (id:number) => request(`/staff/quick-replies/${id}`, { method: "DELETE" }),
  customerContext: (id:number) => request<{ context?: Record<string, any> | null }>(`/staff/conversations/${id}/context`),
  uploadAttachment: (id:number,file:File,caption="") => uploadRequest<{ message:SupportMessage }>(`/staff/conversations/${id}/attachments`,file,caption),
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

export type StaffStreamPacket = { id?: string; event: string; data: Record<string, any> };
export async function openStaffConversationStream(conversationId: number, afterSequence = 0, signal?: AbortSignal) {
  if (!API) throw new Error("Staff API is not configured. Set VITE_API_BASE_URL during the production build.");
  const response=await fetch(`${API}/staff/conversations/${conversationId}/stream?after_sequence=${Math.max(0,Number(afterSequence||0))}`,{
    headers:{ Authorization:`Bearer ${token()}`,Accept:"text/event-stream",...platformHeaders() },cache:"no-store",signal,
  });
  if (!response.ok || !response.body) throw new Error(`Conversation stream failed (${response.status})`);
  return response;
}
export async function consumeStaffEventStream(response:Response,onPacket:(packet:StaffStreamPacket)=>void,signal?:AbortSignal){
  if(!response.body)throw new Error("Stream body is unavailable");
  const reader=response.body.getReader(); const decoder=new TextDecoder(); let buffer="";
  try{while(!signal?.aborted){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});while(true){const match=buffer.match(/\r?\n\r?\n/);if(!match||match.index===undefined)break;const boundary=match.index;const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+match[0].length);let id="",event="message";const data:string[]=[];for(const line of block.split(/\r?\n/)){if(!line||line.startsWith(":"))continue;if(line.startsWith("id:"))id=line.slice(3).trim();else if(line.startsWith("event:"))event=line.slice(6).trim()||"message";else if(line.startsWith("data:"))data.push(line.slice(5).trimStart());}if(!data.length)continue;try{onPacket({id,event,data:JSON.parse(data.join("\n"))});}catch{onPacket({id,event,data:{text:data.join("\n")}});}}}}finally{try{await reader.cancel();}catch{}try{reader.releaseLock();}catch{}}
}
