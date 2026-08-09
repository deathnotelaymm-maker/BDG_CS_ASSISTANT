import {
  Activity, Archive, ArrowRightLeft, BarChart3, CheckCircle2, Clock3, FileText, Headphones,
  Image as ImageIcon, LayoutDashboard, LogOut, MessageCircle, MoreHorizontal, Paperclip, Plus,
  RefreshCw, Save, Search, Send, ShieldCheck, StickyNote, UserRound, Users, Wifi, WifiOff, Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  api, saveToken, saveSession, actorMode, getStaffPlatformRoute, token, websocketUrl, openStaffConversationStream, consumeStaffEventStream,
  type Conversation, type ConversationDetail, type Staff, type StaffSettings, type SupportMessage,
} from "./api";

type View = "dashboard" | "conversations" | "archive" | "performance" | "profile" | "staff";
type QueueTab = "waiting" | "mine" | "team" | "transferred" | "closed";
type RightTab = "conversation" | "shortcuts";
type SocketState = "connecting" | "connected" | "reconnecting" | "offline";
type QuickReply = { id:number; scope_kind:string; title:string; shortcut?:string; category:string; message_text:string };
type ComposerMode = "reply" | "note";

const queueTabs: Array<{ key: QueueTab; label: string }> = [
  { key: "waiting", label: "Waiting" }, { key: "mine", label: "Mine" }, { key: "team", label: "Team" },
  { key: "transferred", label: "Transferred" }, { key: "closed", label: "Resolved" },
];

function formatDate(value?: string, zone?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit",month:"short",day:"2-digit",...(zone?{timeZone:zone}:{})}).format(new Date(value));
}
function formatDuration(seconds: unknown) { const v=Math.max(0,Number(seconds||0)); if(v<60)return `${v}s`; const m=Math.floor(v/60); if(m<60)return `${m}m`; return `${Math.floor(m/60)}h ${m%60}m`[...]
function mergeMessage(list:SupportMessage[],message:SupportMessage){return [...list.filter((x)=>x.id!==message.id&&(!message.client_message_id||x.client_message_id!==message.client_message_id)),me[...]
function statusLabel(value:string){return String(value||"").replaceAll("_"," ").toLowerCase().replace(/(^|\s)\S/g,(x)=>x.toUpperCase());}

function Login({onLogin}:{onLogin:(staff:Staff,settings:StaffSettings)=>void}){
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[twofa,setTwofa]=useState(""),[mode,setMode]=useState<"STAFF"|"ADMIN">("STAFF"),[need2fa,setNeed2fa]=useState(false),[busy[...]
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError("");try{const response:any=await api.login(email,password,mode,twofa);if(response?.twofa_required){setNeed2fa[...]
  return <main className="login-screen"><form className="login-card" onSubmit={submit}><div className="brand-block"><ShieldCheck/><div><strong>Luke Support Workspace</strong><span>Platform-scoped [...]
}

export default function App(){
  const [staff,setStaff]=useState<Staff|null>(null),[settings,setSettings]=useState<StaffSettings>({platform_timezone:"UTC",heartbeat_interval_seconds:30});
  const [view,setView]=useState<View>("dashboard"),[tab,setTab]=useState<QueueTab>("waiting"),[rightTab,setRightTab]=useState<RightTab>("conversation");
  const [conversations,setConversations]=useState<Conversation[]>([]),[detail,setDetail]=useState<ConversationDetail|null>(null),[selectedId,setSelectedId]=useState<number|null>(null);
  const [performance,setPerformance]=useState<Record<string,any>>({}),[onlineStaff,setOnlineStaff]=useState<Staff[]>([]),[quickReplies,setQuickReplies]=useState<QuickReply[]>([]),[transferRequests[...]
  const [draft,setDraft]=useState(""),[composerMode,setComposerMode]=useState<ComposerMode>("reply"),[search,setSearch]=useState(""),[quickSearch,setQuickSearch]=useState(""),[error,setError]=useS[...]
  const selectedRef=useRef<number|null>(null),sequenceRef=useRef(0),socketRef=useRef<WebSocket|null>(null),streamAbortRef=useRef<AbortController|null>(null),fileRef=useRef<HTMLInputElement|null>(n[...]
  const isAdmin=staff?.actor_type==="ADMIN"||actorMode()==="ADMIN";
  const zone=staff?.use_platform_timezone===false&&staff.timezone?staff.timezone:settings.platform_timezone||"UTC";
  const canReply=Boolean(detail&&staff&&detail.conversation.control_mode==="HUMAN"&&["WAITING_FOR_AGENT","ASSIGNED","AGENT_ACTIVE","TRANSFER_REQUESTED"].includes(detail.conversation.status)&&(isAd[...]
  const canUpload=canReply&&settings.staff_attachments_enabled!==false;
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return q?conversations.filter((x)=>[x.customer_display_name,x.customer_identifier,x.last_message,x.assigned_staff_name,x.handoff_r[...]
  const shownQuickReplies=useMemo(()=>{const q=quickSearch.toLowerCase().trim();return quickReplies.filter((x)=>!q||`${x.title} ${x.shortcut||""} ${x.category} ${x.message_text}`.toLowerCase().inc[...]
  const scrollLatest=useCallback(()=>requestAnimationFrame(()=>{const el=messagePaneRef.current;if(el)el.scrollTo({top:el.scrollHeight,behavior:"smooth"});}),[]);

  const loadConversation=useCallback(async(id:number)=>{try{const value=await api.conversation(id);setDetail({...value,messages:Array.isArray(value.messages)?value.messages:[]});setSelectedId(id);[...]
  const loadList=useCallback(async()=>{if(!staff)return;try{setConversations(await api.conversations(view==="archive"?"closed":tab));}catch(c){setError(c instanceof Error?c.message:"Could not load[...]
  const loadShared=useCallback(async()=>{if(!staff)return;const [perf,online,replies,transfers]=await Promise.all([api.performance("day").catch(()=>({})),api.online().catch(()=>[]),api.quickReplie[...]
  const refresh=useCallback(async()=>{setError("");await Promise.all([loadList(),loadShared()]);if(selectedRef.current)await loadConversation(selectedRef.current);},[loadList,loadShared,loadConver[...]
  const syncCurrent=useCallback(async()=>{const id=selectedRef.current;if(!id)return;try{const data=await api.sync(id,sequenceRef.current);setDetail((current)=>current?{...current,conversation:dat[...]

  useEffect(()=>{if(token())api.me().then((x)=>{setStaff(x.staff);setSettings(x.settings);}).catch(()=>saveToken(""));},[]);
  useEffect(()=>{if(!staff)return;void refresh();const timer=window.setInterval(()=>{void loadList();if(selectedRef.current)void syncCurrent();},socketState==="connected"?12000:2500);return()=>cle[...]
  useEffect(()=>{if(!staff)return;const timer=window.setInterval(()=>api.heartbeat(staff.availability_status).catch(()=>undefined),Math.max(15,Number(settings.heartbeat_interval_seconds||30))*1000[...]
  useEffect(()=>{if(!staff||!token()||isAdmin){setSocketState(isAdmin?"connected":"offline");return;}let disposed=false;let reconnect:number|undefined;const connect=async()=>{setSocketState(socket[...]
  useEffect(()=>{streamAbortRef.current?.abort();if(!staff||!selectedId)return;const controller=new AbortController();streamAbortRef.current=controller;let retry:number|undefined;const connect=asy[...]

  async function changePresence(status:"active"|"invisible"){if(!staff)return;await api.presence(status);setStaff({...staff,availability_status:status});}
  async function accept(item:Conversation){try{if(!isAdmin)await api.accept(item.id);setView("conversations");setTab(isAdmin?"team":"mine");await loadConversation(item.id);await loadList();}catch([...]
  async function send(){if(!detail||!draft.trim()||!canReply)return;const text=draft;setDraft("");try{if(composerMode==="note"){await api.note(detail.conversation.id,text);await loadConversation(d[...]
  function addNote(){setComposerMode("note");requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>(".composer textarea")?.focus());}
  async function transfer(){if(!detail)return;const active=onlineStaff.filter((x)=>x.id!==staff?.id&&x.availability_status==="active");if(!active.length){setError("No other Active staff member is [...]
  async function transferDecision(id:number,action:"accept"|"reject"){try{await api.transferDecision(id,action);await refresh();if(action==="accept"){const request=transferRequests.find((x)=>Numbe[...]
  async function resolve(){if(!detail)return;if(!confirm("Resolve and return the customer to platform support?"))return;await api.resolve(detail.conversation.id);await loadConversation(detail.conv[...]
  async function upload(file:File){if(!detail||!canUpload)return;setUploading(true);try{const result=await api.uploadAttachment(detail.conversation.id,file);setDetail((d)=>d?{...d,messages:mergeMe[...]
  function insertQuickReply(reply:QuickReply){if(!canReply)return;setDraft((current)=>current?`${current}\n${reply.message_text}`:reply.message_text);}
  async function createPersonalReply(){const title=prompt("Quick reply title:");if(!title)return;const message=prompt("Quick reply message:");if(!message)return;await api.createQuickReply({title,m[...]
  async function logout(){try{await api.logout();}catch{}saveSession("",isAdmin?"ADMIN":"STAFF");setStaff(null);}

  if(!staff){const sharedHost=(()=>{try{return new URL(String(import.meta.env.VITE_LUKE_SHARED_STAFF_ORIGIN||"https://cs.ar-ai666.com")).hostname.toLowerCase();}catch{return "cs.ar-ai666.com";}})([...]
  return <div className="app-shell">
    <aside className="sidebar"><div className="sidebar-brand"><Headphones/><div><strong>Luke Support Workspace</strong><small>{staff.public_display_name||staff.display_name}{isAdmin?" · Administr[...]
      <button className={view==="dashboard"?"active":""} onClick={()=>setView("dashboard")}><LayoutDashboard/>Dashboard</button>
      <button className={view==="conversations"?"active":""} onClick={()=>setView("conversations")}><MessageCircle/>Conversations</button>
      <button className={view==="archive"?"active":""} onClick={()=>{setView("archive");setTab("closed");}}><Archive/>Archive</button>
      <button className={view==="performance"?"active":""} onClick={()=>setView("performance")}><BarChart3/>Performance</button>{!isAdmin&&<button className={view==="profile"?"active":""} onClick=[...]
    </nav><div className="sidebar-footer"><div className={`connection ${socketState}`}><span/>{socketState==="connected"?"Realtime connected":socketState==="offline"?"Fallback syncing":"Reconnecti[...]
    <section className="workspace-shell"><header className="topbar"><div><h1>{view==="dashboard"?"Dashboard":view==="performance"?"Performance":view==="profile"?"My Profile":view==="staff"?"Staff [...]
      {view==="dashboard"&&<Dashboard conversations={conversations} performance={performance} transferRequests={transferRequests} onOpen={(id)=>{setView("conversations");void loadConversation(id);[...]
      {(view==="conversations"||view==="archive")&&<div className="professional-workspace">
        <aside className="conversation-rail"><div className="queue-tabs">{queueTabs.filter((x)=>(view!=="archive"||x.key==="closed")&&(!isAdmin||!["mine","transferred"].includes(x.key))).map((x)=>[...]
        <main className="conversation-main">{detail?<><header className="conversation-header"><div><h2>{detail.conversation.customer_display_name||detail.conversation.customer_identifier||`Custome[...]
        <aside className="context-panel"><div className="right-tabs"><button className={rightTab==="conversation"?"active":""} onClick={()=>setRightTab("conversation")}>Conversation</button><butto[...]
      </div>}
      {view==="performance"&&<Performance data={performance}/>} {!isAdmin&&view==="profile"&&<StaffProfile staff={staff} settings={settings} onUpdated={setStaff} onError={setError}/>} {view==="sta[...]
    </section>
  </div>;
}

function Timeline({detail,zone,settings}:{detail:ConversationDetail;zone:string;settings:StaffSettings}){
  const items=[...detail.messages.filter((m)=>!m.is_internal).map((message)=>({kind:"message" as const,at:message.created_at||"",id:`m-${message.id}`,message})),...detail.notes.map((note)=>({kind:[...]
  return <>{items.map((item)=>item.kind==="note"?<div className="internal-note-card" key={item.id}><div>🔒 <strong>Internal Note</strong></div><p>{item.note.note_text}</p><small>{item.note.autho[...]
}
function MessageBubble({message,zone,settings}:{message:SupportMessage;zone:string;settings:StaffSettings}){
  if(message.sender_type==="SYSTEM")return <div className="system-message"><Activity/><span>{message.body_text}</span><time>{formatDate(message.created_at,zone)}</time></div>;
  const image=message.message_type==="image"&&message.attachment_url; const file=message.message_type==="attachment"&&message.attachment_url;
  const outbound=message.sender_type!=="CUSTOMER"; const avatar=message.sender_avatar_url||(message.sender_type==="AI"?settings.automated_support_avatar_url:""); const name=message.sender_type===[...]
  return <div className={`message-row ${outbound?"outbound":"inbound"}`}>{outbound&&<span className="chat-head">{avatar?<img src={avatar} alt=""/>:<Headphones/>}</span>}<div className={`message $[...]
}
function ConversationContext({detail,context,zone}:{detail:ConversationDetail|null;context:Record<string,any>|null;zone:string}){if(!detail)return <div className="right-empty"><UserRound/><p>Sele[...]
function Shortcuts({replies,search,onSearch,onUse,onCreate}:{replies:QuickReply[];search:string;onSearch:(v:string)=>void;onUse:(r:QuickReply)=>void;onCreate:()=>void}){return <div className="sho[...]
function StaffProfile({staff,settings,onUpdated,onError}:{staff:Staff;settings:StaffSettings;onUpdated:(staff:Staff)=>void;onError:(message:string)=>void}){
  const [displayName,setDisplayName]=useState(staff.display_name||"");
  const [profileAvatar,setProfileAvatar]=useState(staff.profile_avatar_url||"");
  const [publicName,setPublicName]=useState(staff.public_display_name||staff.display_name||"");
  const [publicAvatar,setPublicAvatar]=useState(staff.public_avatar_url||"");
  const [saving,setSaving]=useState(false),[uploadingProfile,setUploadingProfile]=useState(false),[uploadingPublic,setUploadingPublic]=useState(false);
  const internalRef=useRef<HTMLInputElement|null>(null),publicRef=useRef<HTMLInputElement|null>(null);
  useEffect(()=>{setDisplayName(staff.display_name||"");setProfileAvatar(staff.profile_avatar_url||"");setPublicName(staff.public_display_name||staff.display_name||"");setPublicAvatar(staff.publi[...]
  const enabled=settings.staff_profile_edit_enabled!==false,publicEnabled=enabled&&settings.staff_public_identity_edit_enabled!==false;
  async function uploadImage(file:File,target:"profile"|"public"){target==="profile"?setUploadingProfile(true):setUploadingPublic(true);try{const result=await api.uploadProfileImage(file);if(targ[...]
  async function save(){if(!enabled)return;setSaving(true);try{const result=await api.updateProfile({display_name:displayName,profile_avatar_url:profileAvatar,public_display_name:publicName,publi[...]
  return <div className="profile-page"><section className="profile-card"><header><div><h2>My Profile</h2><p>Manage your CS account and the identity customers see during human support.</p></div><b[...]
}
function AvatarEditor({url,fallback,label,busy,disabled,onChoose,onClear}:{url:string;fallback:string;label:string;busy:boolean;disabled:boolean;onChoose:()=>void;onClear:()=>void}){return <div c[...]
function StaffManagement({staff,onForceLogout}:{staff:Staff[];onForceLogout:(id:number)=>Promise<void>}){return <div className="dashboard"><section className="dashboard-table"><header><div><h2>St[...]
function Dashboard({conversations,performance,transferRequests,onOpen,onAccept,onTransferDecision,zone}:{conversations:Conversation[];performance:Record<string,any>;transferRequests:Array<Record<[...]
  return <div className="dashboard">
    {transferRequests&&transferRequests.length>0&&<section className="transfer-requests-section">
      <header><h2>Transfer Requests</h2></header>
      <div className="transfer-list">
        {transferRequests.map((request)=>(
          <div key={request.id} className="transfer-request-item">
            <div className="transfer-info">
              <div><strong>{request.customer_name||"Customer"}</strong></div>
              <small>From: {request.from_staff_name||"Unknown"}</small>
            </div>
            <div className="transfer-actions">
              <button className="accept-btn" onClick={()=>onTransferDecision?.(request.id,"accept")}><CheckCircle2 size={16}/>Accept</button>
              <button className="reject-btn" onClick={()=>onTransferDecision?.(request.id,"reject")}><ArrowRightLeft size={16}/>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </section>}
    <section className="performance-section">
      <Metric icon={Users} label="Conversations" value={Number(performance.conversations||0)}/>
      <Metric icon={Clock3} label="Avg Response" value={formatDuration(performance.avg_response_time_seconds)}/>
    </section>
  </div>;
}
function Performance({data}:{data:Record<string,any>}){return <div className="performance"><div className="metric-grid"><Metric icon={Users} label="Conversations" value={Number(data.conversations[...]
function Metric({icon:Icon,label,value}:{icon:typeof Users;label:string;value:string|number}){return <article className="metric"><Icon/><div><span>{label}</span><strong>{value}</strong></div></ar[...]
