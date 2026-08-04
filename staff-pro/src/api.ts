export type Staff = {id:number;display_name:string;email:string;availability_status:string;permissions:string[];max_active_conversations:number;must_change_password:boolean;platform_id:number;timezone?:string;use_platform_timezone?:boolean;personal_timezone_allowed?:boolean};
export type Conversation = {id:number;public_id:string;customer_identifier?:string;customer_display_name?:string;status:string;handoff_reason?:string;assigned_staff_id?:number|null;assigned_staff_name?:string;last_message?:string;last_message_at?:string;queue_entered_at?:string;unread_count?:number};
export type SupportMessage = {id:number;public_id:string;sender_type:'CUSTOMER'|'AI'|'STAFF'|'SYSTEM';sender_name?:string;body_text:string;is_internal?:boolean;created_at:string};
const API=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
const TOKEN_KEY='bdg_support_staff_token';
export const token=()=>localStorage.getItem(TOKEN_KEY)||'';
export const saveToken=(value:string)=>value?localStorage.setItem(TOKEN_KEY,value):localStorage.removeItem(TOKEN_KEY);
async function request<T>(path:string,init:RequestInit={}){const headers=new Headers(init.headers);headers.set('Content-Type','application/json');if(token())headers.set('Authorization',`Bearer ${token()}`);const r=await fetch(`${API}${path}`,{...init,headers,cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.message||data?.error||`Request failed (${r.status})`);return data as T;}
export const api={
 login:(email:string,password:string)=>request<{access_token:string;staff:Staff}>('/staff/auth/login',{method:'POST',body:JSON.stringify({email,password})}),
 me:()=>request<{staff:Staff;settings:{platform_timezone:string;heartbeat_interval_seconds:number}}>('/staff/me'),
 logout:()=>request('/staff/logout',{method:'POST'}),
 presence:(status:'active'|'invisible')=>request('/staff/presence',{method:'PUT',body:JSON.stringify({status})}),
 heartbeat:(status:string)=>request('/staff/heartbeat',{method:'POST',body:JSON.stringify({status})}),
 preferences:(data:{use_platform_timezone:boolean;timezone?:string})=>request('/staff/me/preferences',{method:'PUT',body:JSON.stringify(data)}),
 conversations:(tab:string)=>request<Conversation[]>(`/staff/conversations?tab=${encodeURIComponent(tab)}`),
 conversation:(id:number)=>request<{conversation:Conversation;messages:SupportMessage[];notes:any[];transfers:any[]}>(`/staff/conversations/${id}`),
 accept:(id:number)=>request(`/staff/conversations/${id}/accept`,{method:'POST'}),
 reply:(id:number,message:string)=>request(`/staff/conversations/${id}/messages`,{method:'POST',body:JSON.stringify({message,client_message_id:crypto.randomUUID()})}),
 note:(id:number,note:string)=>request(`/staff/conversations/${id}/notes`,{method:'POST',body:JSON.stringify({note})}),
 resolve:(id:number)=>request(`/staff/conversations/${id}/resolve`,{method:'POST'}),
 reopen:(id:number)=>request(`/staff/conversations/${id}/reopen`,{method:'POST'}),
 online:()=>request<Staff[]>('/staff/online'),
 transfer:(id:number,target_staff_id:number,reason:string)=>request(`/staff/conversations/${id}/transfer`,{method:'POST',body:JSON.stringify({target_staff_id,reason})}),
 transfers:(status='requested')=>request<any[]>(`/staff/transfers?status=${encodeURIComponent(status)}`),
 transferDecision:(id:number,action:'accept'|'reject')=>request(`/staff/transfers/${id}/${action}`,{method:'POST'}),
 changePassword:(password:string)=>request('/staff/me/password',{method:'POST',body:JSON.stringify({password})}),
 performance:()=>request<any>('/staff/performance?period=day'),
};
export function websocketUrl(){const base=API||location.origin;const u=new URL(base,location.origin);u.protocol=u.protocol==='https:'?'wss:':'ws:';u.pathname='/support';u.search='';return u.toString();}
