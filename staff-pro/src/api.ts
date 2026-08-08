export type ActorType = "STAFF" | "ADMIN";
export type Staff = {
  id: number;
  actor_type?: ActorType;
  display_name: string;
  public_display_name?: string;
  public_avatar_url?: string;
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
  id: number; public_id: string; customer_identifier?: string; customer_display_name?: string; customer_locale?: string;
  status: string; control_mode: "AI" | "HUMAN" | "CLOSED" | string; handoff_reason?: string;
  assigned_staff_id?: number | null; assigned_staff_name?: string; last_message?: string; last_message_at?: string;
  queue_entered_at?: string; created_at?: string; unread_count?: number; waiting_seconds?: number; last_message_sequence?: number;
  return_to_ai_on_resolve?: boolean; version?: number; last_customer_read_sequence?: number; last_staff_read_sequence?: number;
};

export type SupportMessage = {
  id: number; public_id: string; conversation_id?: number; client_message_id?: string; ai_job_id?: number | null;
  message_sequence: number; sender_type: "CUSTOMER" | "AI" | "STAFF" | "SYSTEM"; sender_name?: string; sender_avatar_url?: string;
  message_type?: string; body_text: string; attachment_url?: string; attachment_name?: string; attachment_content_type?: string;
  attachment_size_bytes?: number; is_internal?: boolean; delivered_at?: string; read_at?: string; metadata?: Record<string, any>; created_at: string;
};

export type InternalNote = { id:number; note_text:string; author_name?:string; author_admin_email?:string; author_staff_id?:number|null; created_at?:string };
export type ConversationDetail = { conversation: Conversation; messages: SupportMessage[]; notes: InternalNote[]; transfers: Array<Record<string, unknown>> };
export type StaffSettings = {
  platform_timezone: string; heartbeat_interval_seconds: number; offline_timeout_seconds?: number; allow_staff_timezone_override?: boolean;
  return_to_ai_on_resolve?: boolean; realtime_poll_interval_ms?: number; customer_attachments_enabled?: boolean; staff_attachments_enabled?: boolean;
  attachment_max_bytes?: number; attachment_allowed_types?: string[]; automated_support_display_name?:string; automated_support_avatar_url?:string;
  admin_support_display_name?:string; admin_support_avatar_url?:string; show_staff_public_name?:boolean; show_staff_avatar?:boolean;
};

const API=(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/,"");
const TOKEN_KEY="luke_support_workspace_token";
const MODE_KEY="luke_support_workspace_actor";
export function getStaffPlatformRoute(){ if(typeof window==="undefined")return ""; return window.location.pathname.match(/^\/p\/([a-z0-9-]+)(?:\/|$)/i)?.[1] || ""; }
function key(base:string){const route=getStaffPlatformRoute();return route?`${base}:${route}`:base;}
export const actorMode=():ActorType=>(localStorage.getItem(key(MODE_KEY))==="ADMIN"?"ADMIN":"STAFF");
export const token=()=>localStorage.getItem(key(TOKEN_KEY)) || localStorage.getItem("luke_support_staff_token") || localStorage.getItem("bdg_support_staff_token") || "";
export function saveSession(value:string,mode:ActorType){if(value){localStorage.setItem(key(TOKEN_KEY),value);localStorage.setItem(key(MODE_KEY),mode);}else{localStorage.removeItem(key(TOKEN_KEY));localStorage.removeItem(key(MODE_KEY));localStorage.removeItem("luke_support_staff_token");localStorage.removeItem("bdg_support_staff_token");}}
export const saveToken=(value:string)=>saveSession(value,actorMode());
function platformHeaders(){const route=getStaffPlatformRoute();return route?{"X-BDG-Platform-Route":route}:{};}

async function raw<T>(path:string,init:RequestInit={}){
  if(!API)throw new Error("Support Workspace API is not configured. Set VITE_API_BASE_URL during the production build.");
  const headers=new Headers(init.headers); if(!(init.body instanceof FormData))headers.set("Content-Type","application/json");
  if(token())headers.set("Authorization",`Bearer ${token()}`); for(const [k,v] of Object.entries(platformHeaders()))headers.set(k,v);
  const response=await fetch(`${API}${path}`,{...init,headers,cache:"no-store"}); const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.message||data?.error||data?.detail||`Request failed (${response.status})`); return {data:data as T,status:response.status};
}
async function request<T>(path:string,init:RequestInit={}){return (await raw<T>(path,init)).data;}
async function uploadRequest<T>(path:string,file:File,caption=""){const body=new FormData();body.append("file",file);body.append("client_message_id",crypto.randomUUID());if(caption)body.append("caption",caption);return request<T>(path,{method:"POST",body});}

function adminPath(staffPath:string,adminPathValue:string){return actorMode()==="ADMIN"?adminPathValue:staffPath;}
function adminActor(user:any,context:any):Staff{return {id:0,actor_type:"ADMIN",display_name:user?.name||"Administrator",public_display_name:user?.name||"Administrator",email:user?.email||"",availability_status:"active",permissions:["*"],max_active_conversations:999,must_change_password:false,platform_id:Number(context?.platform?.platform_id||context?.platform?.id||0),use_platform_timezone:true};}

async function uploadRequest<T>(path: string, file: File, caption = "") {
  if (!API) throw new Error("Support Workspace API is not configured.");
  const body = new FormData();
  body.append("file", file);
  body.append("client_message_id", crypto.randomUUID());
  if (caption) body.append("caption", caption);
  
  const headers = new Headers();
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  for (const [key, value] of Object.entries(platformHeaders())) headers.set(key, value);
  
  const response = await fetch(`${API}${path}`, { method: "POST", headers, body, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || `Upload failed (${response.status})`);
  return data as T;
}

export const api={
  login:async(email:string,password:string,mode:ActorType="STAFF",twofa_code="")=>{
    if(mode==="STAFF")return request<{access_token:string;staff:Staff}>("/staff/auth/login",{method:"POST",body:JSON.stringify({email,password})});
    const result=await raw<any>("/auth/login",{method:"POST",body:JSON.stringify({email,password,twofa_code})});
    if(result.status===202||result.data?.twofa_required)return {twofa_required:true} as any;
    saveSession(result.data.access_token,"ADMIN"); const context=await request<any>("/admin/platform-context");
    return {access_token:result.data.access_token,staff:adminActor(result.data.user,context)};
  },
  me:async()=>{if(actorMode()==="STAFF")return request<{staff:Staff;settings:StaffSettings}>("/staff/me");const [me,context,settings]=await Promise.all([request<any>("/admin/me"),request<any>("/admin/platform-context"),request<StaffSettings>("/admin/support/settings")]);return {staff:adminActor(me.user,context),settings};},
  logout:async()=>{if(actorMode()==="STAFF")await request("/staff/logout",{method:"POST"}).catch(()=>null);saveSession("",actorMode());return {ok:true};},
  presence:(status:"active"|"invisible")=>actorMode()==="ADMIN"?Promise.resolve({ok:true}):request("/staff/presence",{method:"PUT",body:JSON.stringify({status})}),
  heartbeat:(status:string)=>actorMode()==="ADMIN"?Promise.resolve({ok:true}):request("/staff/heartbeat",{method:"POST",body:JSON.stringify({status})}),
  preferences:(data:{use_platform_timezone:boolean;timezone?:string})=>actorMode()==="ADMIN"?Promise.resolve({ok:true}):request("/staff/me/preferences",{method:"PUT",body:JSON.stringify(data)}),
  conversations:async(tab:string)=>{if(actorMode()==="STAFF")return request<Conversation[]>(`/staff/conversations?tab=${encodeURIComponent(tab)}`);const all=await request<Conversation[]>("/admin/support/conversations?limit=200");if(tab==="waiting")return all.filter(x=>x.status==="WAITING_FOR_AGENT");if(tab==="closed")return all.filter(x=>["RESOLVED","CLOSED"].includes(x.status));return all;},
  conversation:(id:number)=>request<ConversationDetail>(adminPath(`/staff/conversations/${id}`,`/admin/support/conversations/${id}`)),
  accept:(id:number)=>actorMode()==="ADMIN"?request<{conversation:Conversation}>(`/admin/support/conversations/${id}/reopen`,{method:"POST"}):request<{conversation:Conversation}>(`/staff/conversations/${id}/accept`,{method:"POST"}),
  reply:(id:number,message:string,clientMessageId=crypto.randomUUID())=>request<{message:SupportMessage}>(adminPath(`/staff/conversations/${id}/messages`,`/admin/support/conversations/${id}/messages`),{method:"POST",body:JSON.stringify({message,client_message_id:clientMessageId})}),
  note:(id:number,note:string)=>request(adminPath(`/staff/conversations/${id}/notes`,`/admin/support/conversations/${id}/notes`),{method:"POST",body:JSON.stringify({note})}),
  resolve:(id:number)=>request<{conversation:Conversation;return_to_ai?:boolean}>(adminPath(`/staff/conversations/${id}/resolve`,`/admin/support/conversations/${id}/resolve`),{method:"POST"}),
  reopen:(id:number)=>request<{conversation:Conversation}>(adminPath(`/staff/conversations/${id}/reopen`,`/admin/support/conversations/${id}/reopen`),{method:"POST"}),
  online:()=>request<Staff[]>(adminPath("/staff/online","/admin/support/staff")),
  transfer:(id:number,target_staff_id:number,reason:string)=>actorMode()==="ADMIN"?request(`/admin/support/conversations/${id}/assign`,{method:"POST",body:JSON.stringify({staff_id:target_staff_id,reason})}):request(`/staff/conversations/${id}/transfer`,{method:"POST",body:JSON.stringify({target_staff_id,reason})}),
  transfers:(status="requested")=>actorMode()==="ADMIN"?Promise.resolve([] as Array<Record<string,unknown>>):request<Array<Record<string,unknown>>>(`/staff/transfers?status=${encodeURIComponent(status)}`),
  transferDecision:(id:number,action:"accept"|"reject")=>request(`/staff/transfers/${id}/${action}`,{method:"POST"}),
  changePassword:(password:string)=>actorMode()==="ADMIN"?request("/admin/me/password",{method:"POST",body:JSON.stringify({password})}):request("/staff/me/password",{method:"POST",body:JSON.stringify({password})}),
  performance:async(period:"day"|"week"|"month"="day")=>{if(actorMode()==="STAFF")return request<Record<string,unknown>>(`/staff/performance?period=${period}`);const rows=await request<any[]>("/admin/support/performance");return {conversations_served:rows.reduce((n,x)=>n+Number(x.conversations_served||0),0),resolved_conversations:rows.reduce((n,x)=>n+Number(x.resolved_conversations||0),0),replies_sent:rows.reduce((n,x)=>n+Number(x.replies_sent||0),0),avg_first_response_seconds:rows.length?Math.round(rows.reduce((n,x)=>n+Number(x.avg_first_response_seconds||0),0)/rows.length):0,staff_rows:rows};},
  quickReplies:()=>request<Array<{id:number;scope_kind:string;title:string;shortcut?:string;category:string;message_text:string}>>(adminPath("/staff/quick-replies","/admin/support/quick-replies")),
  createQuickReply:(data:{title:string;shortcut?:string;category?:string;message_text:string})=>request(adminPath("/staff/quick-replies","/admin/support/quick-replies"),{method:"POST",body:JSON.stringify(actorMode()==="ADMIN"?{...data,scope_kind:"platform"}:data)}),
  deleteQuickReply:(id:number)=>request(adminPath(`/staff/quick-replies/${id}`,`/admin/support/quick-replies/${id}`),{method:"DELETE"}),
  customerContext:(id:number)=>request<{context?:Record<string,any>|null}>(adminPath(`/staff/conversations/${id}/context`,`/admin/support/conversations/${id}/context`)),
  uploadAttachment:(id:number,file:File,caption="")=>uploadRequest<{message:SupportMessage}>(adminPath(`/staff/conversations/${id}/attachments`,`/admin/support/conversations/${id}/attachments`),file,caption),
  realtimeTicket:()=>actorMode()==="ADMIN"?Promise.reject(new Error("Admin mode uses SSE for permanent conversation delivery")):request<{ticket:string;expires_at:string}>("/staff/realtime-ticket",{method:"POST",body:"{}"}),
  sync:async(id:number,afterSequence=0)=>{if(actorMode()==="STAFF")return request<{conversation:Conversation;messages:SupportMessage[]}>(`/staff/conversations/${id}/sync?after_sequence=${Math.max(0,Number(afterSequence||0))}`);const detail=await request<ConversationDetail>(`/admin/support/conversations/${id}`);return {conversation:detail.conversation,messages:detail.messages.filter(m=>Number(m.message_sequence||0)>afterSequence)};},
  forceLogoutStaff:(id:number)=>request(`/admin/support/staff/${id}/force-logout`,{method:"POST"}),
};

export function websocketUrl(ticket=""){const base=API||location.origin;const url=new URL(base,location.origin);url.protocol=url.protocol==="https:"?"wss:":"ws:";url.pathname="/support";url.search=ticket?`?ticket=${encodeURIComponent(ticket)}`:"";return url.toString();}
export type StaffStreamPacket={id?:string;event:string;data:Record<string,any>};
export async function openStaffConversationStream(conversationId:number,afterSequence=0,signal?:AbortSignal){if(!API)throw new Error("Support Workspace API is not configured.");const path=actorMode()==="ADMIN"?`/admin/support/conversations/${conversationId}/stream?after_sequence=${Math.max(0,Number(afterSequence||0))}`:`/staff/conversations/${conversationId}/stream?after_sequence=${Math.max(0,Number(afterSequence||0))}`;const response=await fetch(`${API}${path}`,{headers:{Authorization:`Bearer ${token()}`,Accept:"text/event-stream",...platformHeaders()},cache:"no-store",signal});if(!response.ok||!response.body)throw new Error(`Conversation stream failed (${response.status})`);return response;}
export async function consumeStaffEventStream(response:Response,onPacket:(packet:StaffStreamPacket)=>void,signal?:AbortSignal){if(!response.body)throw new Error("Stream body is unavailable");const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="";try{while(!signal?.aborted){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});while(true){const match=buffer.match(/\r?\n\r?\n/);if(!match||match.index===undefined)break;const block=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);let id="",event="message";const data:string[]=[];for(const line of block.split(/\r?\n/)){if(!line||line.startsWith(":"))continue;if(line.startsWith("id:"))id=line.slice(3).trim();else if(line.startsWith("event:"))event=line.slice(6).trim()||"message";else if(line.startsWith("data:"))data.push(line.slice(5).trimStart());}if(!data.length)continue;try{onPacket({id,event,data:JSON.parse(data.join("\n"))});}catch{onPacket({id,event,data:{text:data.join("\n")}});}}}}finally{try{await reader.cancel();}catch{}try{reader.releaseLock();}catch{}}}

