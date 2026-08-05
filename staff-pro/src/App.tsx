import {
  Activity,
  Archive,
  ArrowRightLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  Headphones,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  api,
  saveToken,
  token,
  websocketUrl,
  type Conversation,
  type ConversationDetail,
  type Staff,
  type StaffSettings,
  type SupportMessage,
} from "./api";

type View = "dashboard" | "chats" | "archive" | "performance";
type ChatTab = "waiting" | "mine" | "team" | "transferred" | "closed";
type SocketState = "connecting" | "connected" | "reconnecting" | "offline";
type TransferRequest = {
  id: number;
  conversation_id: number;
  customer_display_name?: string;
  customer_identifier?: string;
  from_staff_name?: string;
  reason?: string;
};

const chatTabs: Array<{ key: ChatTab; label: string }> = [
  { key: "waiting", label: "Waiting" },
  { key: "mine", label: "Mine" },
  { key: "team", label: "Team" },
  { key: "transferred", label: "Transferred" },
  { key: "closed", label: "Resolved" },
];

function formatDate(value?: string, zone?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
    ...(zone ? { timeZone: zone } : {}),
  }).format(new Date(value));
}

function formatDuration(seconds: unknown) {
  const value = Math.max(0, Number(seconds || 0));
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function mergeMessage(list: SupportMessage[], message: SupportMessage) {
  const filtered = list.filter((item) => item.id !== message.id && (!message.client_message_id || item.client_message_id !== message.client_message_id));
  return [...filtered, message].sort((left, right) => Number(left.message_sequence || 0) - Number(right.message_sequence || 0));
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill ${value.toLowerCase()}`}>{value.replaceAll("_", " ")}</span>;
}

function Login({ onLogin }: { onLogin: (staff: Staff, settings: StaffSettings) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await api.login(email, password);
      saveToken(response.access_token);
      const me = await api.me();
      onLogin(me.staff, me.settings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-block"><ShieldCheck /><div><strong>Customer Service Console</strong><span>Secure staff access</span></div></div>
        <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /></label>
        <label>Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
        {error && <div className="error-banner">{error}</div>}
        <button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}

export default function App() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [settings, setSettings] = useState<StaffSettings>({ platform_timezone: "UTC", heartbeat_interval_seconds: 30 });
  const [view, setView] = useState<View>("dashboard");
  const [chatTab, setChatTab] = useState<ChatTab>("waiting");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [waitingPreview, setWaitingPreview] = useState<Conversation[]>([]);
  const [minePreview, setMinePreview] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [onlineStaff, setOnlineStaff] = useState<Staff[]>([]);
  const [performance, setPerformance] = useState<Record<string, unknown>>({});
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [socketState, setSocketState] = useState<SocketState>("offline");
  const [customerTyping, setCustomerTyping] = useState(false);
  const [aiState, setAiState] = useState<string>("");
  const [pollIntervalMs, setPollIntervalMs] = useState(2500);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const reconnectAttempt = useRef(0);
  const selectedRef = useRef<number | null>(null);
  const sequenceRef = useRef(0);
  const messagePaneRef = useRef<HTMLDivElement | null>(null);

  const displayTimezone = staff?.use_platform_timezone === false && staff.timezone ? staff.timezone : settings.platform_timezone || "UTC";
  const canReply = Boolean(detail && staff && Number(detail.conversation.assigned_staff_id || 0) === staff.id && detail.conversation.control_mode === "HUMAN" && ["ASSIGNED", "AGENT_ACTIVE", "TRANSFER_REQUESTED"].includes(detail.conversation.status));
  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) => [item.customer_display_name, item.customer_identifier, item.last_message, item.handoff_reason, item.assigned_staff_name].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [conversations, search]);

  const loadConversation = useCallback(async (id: number) => {
    try {
      const value = await api.conversation(id);
      setDetail({ ...value, messages: Array.isArray(value.messages) ? value.messages : [] });
      setSelectedId(id);
      selectedRef.current = id;
      sequenceRef.current = Math.max(0, ...value.messages.map((item) => Number(item.message_sequence || 0)));
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event: "support:subscribe", data: { conversation_id: id } }));
        socket.send(JSON.stringify({ event: "support:sync", data: { conversation_id: id, after_sequence: sequenceRef.current } }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load conversation");
    }
  }, []);

  const loadConversationList = useCallback(async () => {
    if (!staff) return;
    try {
      setConversations(await api.conversations(view === "archive" ? "closed" : chatTab));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load conversations");
    }
  }, [chatTab, staff, view]);

  const loadDashboard = useCallback(async () => {
    if (!staff) return;
    const [waiting, mine, perf, online, incoming] = await Promise.all([
      api.conversations("waiting").catch(() => []),
      api.conversations("mine").catch(() => []),
      api.performance("day").catch(() => ({})),
      api.online().catch(() => []),
      api.transfers().catch(() => []),
    ]);
    setWaitingPreview(waiting.slice(0, 6));
    setMinePreview(mine.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).slice(0, 6));
    setPerformance(perf);
    setOnlineStaff(online);
    setTransfers(incoming as TransferRequest[]);
  }, [staff]);

  const refreshAll = useCallback(async () => {
    setError("");
    await Promise.all([loadDashboard(), loadConversationList()]);
    if (selectedRef.current) await loadConversation(selectedRef.current);
  }, [loadConversation, loadConversationList, loadDashboard]);

  useEffect(() => {
    if (!token()) return;
    api.me().then((response) => { setStaff(response.staff); setSettings(response.settings); }).catch(() => saveToken(""));
  }, []);

  useEffect(() => {
    if (!staff) return;
    void refreshAll();
    const timer = window.setInterval(() => { void loadDashboard(); void loadConversationList(); }, socketState === "connected" ? 12000 : 4000);
    return () => window.clearInterval(timer);
  }, [staff?.id, chatTab, view, refreshAll, loadDashboard, loadConversationList, socketState]);

  useEffect(() => {
    if (!staff) return;
    const interval = Math.max(15, Number(settings.heartbeat_interval_seconds || 30)) * 1000;
    const timer = window.setInterval(() => api.heartbeat(staff.availability_status).catch(() => undefined), interval);
    return () => window.clearInterval(timer);
  }, [staff?.id, staff?.availability_status, settings.heartbeat_interval_seconds]);

  useEffect(() => {
    if (!staff || !token()) return;
    let disposed=false;
    const connect=async()=>{
      if (disposed) return;
      setSocketState(reconnectAttempt.current ? "reconnecting" : "connecting");
      try {
        const ticket=await api.realtimeTicket();
        if (disposed) return;
        const socket=new WebSocket(websocketUrl(ticket.ticket));
        socketRef.current=socket;
        socket.onopen=()=>{
          reconnectAttempt.current=0; setSocketState("connected");
          const selected=selectedRef.current;
          if (selected) { socket.send(JSON.stringify({ event:"support:subscribe",data:{ conversation_id:selected } })); socket.send(JSON.stringify({ event:"support:sync",data:{ conversation_id:selected,after_sequence:sequenceRef.current } })); }
        };
        socket.onmessage=(event)=>{
          try {
            const packet=JSON.parse(String(event.data || "{}")); const data=packet.data || {};
            if (packet.event === "support:force_logout") { saveToken(""); window.location.reload(); return; }
            if (packet.event === "support:snapshot" && Number(data.conversation_id || data.conversation?.id) === selectedRef.current) {
              setDetail((current)=>current ? { ...current,conversation:data.conversation || current.conversation,messages:(data.messages || []).reduce((list:SupportMessage[],item:SupportMessage)=>mergeMessage(list,item),current.messages) } : current);
              for (const item of (data.messages || []) as SupportMessage[]) sequenceRef.current=Math.max(sequenceRef.current,Number(item.message_sequence || 0));
              const active=Array.isArray(data.active_ai_jobs) ? data.active_ai_jobs : data.active_ai_job ? [data.active_ai_job] : []; setAiState(active[0]?.status || "");
            }
            if ((packet.event === "support:message_created" || packet.event === "ai:message_created") && data.message && Number(data.message.conversation_id || selectedRef.current) === selectedRef.current) {
              const message=data.message as SupportMessage; sequenceRef.current=Math.max(sequenceRef.current,Number(message.message_sequence || 0)); setDetail((current)=>current ? { ...current,messages:mergeMessage(current.messages,message) } : current);
              if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ event:"support:read",data:{ conversation_id:selectedRef.current,through_sequence:sequenceRef.current } }));
            }
            if (["ai:job_queued","ai:processing_started","ai:processing_updated"].includes(packet.event) && Number(packet.conversation_id || data.conversation_id || selectedRef.current) === selectedRef.current) setAiState(data.status || "PROCESSING");
            if (["ai:message_created","ai:processing_failed","ai:processing_cancelled"].includes(packet.event)) setAiState("");
            if (packet.event === "support:message_state" && data.actor === "customer" && Number(data.conversation_id) === selectedRef.current) { const through=Number(data.through_sequence || 0); setDetail((current)=>current ? { ...current,messages:current.messages.map((message)=>message.sender_type === "STAFF" && Number(message.message_sequence || 0) <= through ? { ...message,delivered_at:data.updated_at || message.delivered_at,read_at:data.state === "read" ? (data.updated_at || message.read_at) : message.read_at } : message) } : current); }
            if (packet.event === "support:typing" && data.actor === "customer" && Number(data.conversation_id) === selectedRef.current) { setCustomerTyping(data.is_typing === true); if (data.is_typing) window.setTimeout(()=>setCustomerTyping(false),5000); }
            if (packet.event === "support:conversation_resolved" && Number(packet.conversation_id || data.conversation?.id) === selectedRef.current) { setDetail((current)=>current ? { ...current,conversation:data.conversation || { ...current.conversation,status:"RESOLVED",control_mode:data.return_to_ai === false ? "CLOSED" : "AI",assigned_staff_id:null } } : current); }
            if (packet.event === "support:transfer_requested") void api.transfers().then((items)=>setTransfers(items as TransferRequest[])).catch(()=>undefined);
            if (String(packet.event || "").startsWith("support:") || String(packet.event || "").startsWith("ai:")) { void loadDashboard(); void loadConversationList(); }
          } catch {}
        };
        socket.onerror=()=>setSocketState("offline");
        socket.onclose=()=>{ if (disposed) return; setSocketState("reconnecting"); const attempt=Math.min(8,reconnectAttempt.current++); const delay=Math.min(15000,750*2**attempt)+Math.floor(Math.random()*300); reconnectTimer.current=window.setTimeout(()=>void connect(),delay); };
      } catch { if (disposed) return; setSocketState("reconnecting"); const attempt=Math.min(8,reconnectAttempt.current++); const delay=Math.min(15000,750*2**attempt)+Math.floor(Math.random()*300); reconnectTimer.current=window.setTimeout(()=>void connect(),delay); }
    };
    void connect();
    return ()=>{ disposed=true; if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current); socketRef.current?.close(1000,"Staff Console closed"); socketRef.current=null; };
  }, [staff?.id,loadConversationList,loadDashboard]);

  useEffect(()=>{
    if (!staff || !selectedId) return;
    let disposed=false;
    const sync=async()=>{
      try {
        const data=await api.sync(selectedId,sequenceRef.current);
        if (disposed) return;
        setPollIntervalMs(Math.max(1500,Number(data.poll_interval_ms || 2500)));
        setDetail((current)=>current ? { ...current,conversation:data.conversation || current.conversation,messages:(data.messages || []).reduce((list,item)=>mergeMessage(list,item),current.messages) } : current);
        for (const item of data.messages || []) sequenceRef.current=Math.max(sequenceRef.current,Number(item.message_sequence || 0));
        setAiState(data.active_ai_jobs?.[0]?.status || "");
      } catch {}
    };
    void sync();
    const timer=window.setInterval(()=>void sync(),socketState === "connected" ? 12000 : pollIntervalMs);
    const onVisible=()=>{ if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange",onVisible); window.addEventListener("online",onVisible);
    return ()=>{ disposed=true; window.clearInterval(timer); document.removeEventListener("visibilitychange",onVisible); window.removeEventListener("online",onVisible); };
  },[staff?.id,selectedId,socketState,pollIntervalMs]);


  async function changePresence(status: "active" | "invisible") {
    try {
      await api.presence(status);
      setStaff((current) => current ? { ...current, availability_status: status } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update status"); }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    saveToken("");
    setStaff(null);
  }

  async function sendReply() {
    if (!detail || !canReply || !draft.trim()) return;
    const text = draft.trim();
    const clientMessageId = crypto.randomUUID();
    setDraft("");
    const optimistic: SupportMessage = {
      id: -Date.now(), public_id: clientMessageId, conversation_id: detail.conversation.id,
      client_message_id: clientMessageId, message_sequence: Number.MAX_SAFE_INTEGER,
      sender_type: "STAFF", sender_name: staff?.display_name, body_text: text, created_at: new Date().toISOString(),
    };
    setDetail((current) => current ? { ...current, messages: [...current.messages, optimistic] } : current);
    try {
      const response = await api.reply(detail.conversation.id, text, clientMessageId);
      setDetail((current) => current ? { ...current, messages: mergeMessage(current.messages, response.message) } : current);
    } catch (cause) {
      setDraft(text);
      setDetail((current) => current ? { ...current, messages: current.messages.filter((item) => item.id !== optimistic.id) } : current);
      setError(cause instanceof Error ? cause.message : "Could not send reply");
    }
  }

  async function acceptConversation(conversation: Conversation) {
    try {
      await api.accept(conversation.id);
      setView("chats");
      setChatTab("mine");
      await loadConversation(conversation.id);
      await refreshAll();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not accept conversation"); }
  }

  async function resolveConversation() {
    if (!detail) return;
    try {
      const response = await api.resolve(detail.conversation.id);
      setDetail((current) => current ? { ...current, conversation: response.conversation } : current);
      await refreshAll();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not resolve conversation"); }
  }

  async function addNote() {
    if (!detail) return;
    const note = window.prompt("Internal note");
    if (!note?.trim()) return;
    await api.note(detail.conversation.id, note.trim());
    await loadConversation(detail.conversation.id);
  }

  async function transferConversation() {
    if (!detail || !staff) return;
    const candidates = onlineStaff.filter((item) => item.id !== staff.id && item.availability_status === "active");
    if (!candidates.length) return setError("No other Active staff member is available.");
    const selection = Number(window.prompt(`Enter target staff ID:\n${candidates.map((item) => `${item.id}: ${item.display_name}`).join("\n")}`, String(candidates[0].id)));
    const target = candidates.find((item) => item.id === selection);
    if (!target) return setError("Choose a valid Active staff member.");
    const reason = window.prompt(`Transfer reason for ${target.display_name}`);
    if (!reason?.trim()) return;
    await api.transfer(detail.conversation.id, target.id, reason.trim());
    await refreshAll();
  }

  async function decideTransfer(id: number, action: "accept" | "reject") {
    await api.transferDecision(id, action);
    await refreshAll();
  }

  async function changePassword() {
    const value = window.prompt("Enter a new password of at least 12 characters");
    if (!value) return;
    if (value.length < 12) return setError("Password must be at least 12 characters.");
    const response = await api.changePassword(value) as { relogin_required?: boolean };
    if (response.relogin_required) { saveToken(""); window.location.reload(); }
  }

  if (!staff) return <Login onLogin={(nextStaff, nextSettings) => { setStaff(nextStaff); setSettings(nextSettings); }} />;

  const navItems: Array<{ key: View; label: string; icon: typeof LayoutDashboard }> = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "chats", label: "Chats", icon: MessageCircle },
    { key: "archive", label: "Archive", icon: Archive },
    { key: "performance", label: "Performance", icon: BarChart3 },
  ];

  return (
    <div className="staff-shell">
      <aside className="staff-sidebar">
        <div className="sidebar-brand"><ShieldCheck /><div><strong>BDG Support</strong><span>Staff Console</span></div></div>
        <nav className="sidebar-nav">{navItems.map((item) => { const Icon = item.icon; return <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => { setView(item.key); if (item.key === "archive") setChatTab("closed"); }}><Icon />{item.label}</button>; })}</nav>
        <div className="sidebar-footer"><div className="staff-identity"><span className="staff-avatar"><UserRound /></span><div><strong>{staff.display_name}</strong><span>{staff.email}</span></div></div><button className="logout-button" onClick={logout}><LogOut /><span>Logout</span></button></div>
      </aside>

      <section className="staff-main">
        <header className="staff-topbar">
          <div className="topbar-title"><h1>{view === "dashboard" ? "Dashboard" : view === "chats" ? "Conversations" : view === "archive" ? "Archive" : "Performance"}</h1><p>Platform #{staff.platform_id} · {displayTimezone}</p></div>
          <div className="topbar-controls">
            <span className={`connection-state ${socketState}`}>{socketState === "connected" ? <Wifi /> : <WifiOff />}{socketState}</span>
            <div className="presence-control"><button className={staff.availability_status === "active" ? "active" : ""} onClick={() => changePresence("active")}>Active</button><button className={staff.availability_status === "invisible" ? "active" : ""} onClick={() => changePresence("invisible")}>Invisible</button></div>
            <button className="refresh-button" title="Change password" onClick={changePassword}><ShieldCheck /></button>
            <button className="refresh-button" title="Refresh" onClick={refreshAll}><RefreshCw /></button>
          </div>
        </header>
        {error && <div className="error-inline"><span>{error}</span><button onClick={() => setError("")}>×</button></div>}
        {transfers.length > 0 && <div className="transfer-strip"><strong>{transfers.length} transfer request{transfers.length === 1 ? "" : "s"}</strong>{transfers.slice(0, 3).map((transfer) => <span key={transfer.id}>{transfer.from_staff_name || "Staff"} → {transfer.customer_display_name || transfer.customer_identifier || `Conversation ${transfer.conversation_id}`}<button onClick={() => decideTransfer(transfer.id, "accept")}>Accept</button><button onClick={() => decideTransfer(transfer.id, "reject")}>Reject</button></span>)}</div>}

        <main className="main-content">
        {view === "dashboard" && (
          <div className="dashboard-page">
            <section className="metric-grid">
              <Metric icon={Users} label="Waiting customers" value={waitingPreview.length} />
              <Metric icon={MessageCircle} label="My active chats" value={minePreview.length} />
              <Metric icon={CheckCircle2} label="Resolved today" value={Number(performance.resolved_conversations || 0)} />
              <Metric icon={Send} label="Replies today" value={Number(performance.replies_sent || 0)} />
              <Metric icon={Clock3} label="First response" value={formatDuration(performance.avg_first_response_seconds)} />
              <Metric icon={Activity} label="Active today" value={formatDuration((performance.presence as Record<string, unknown> | undefined)?.active)} />
            </section>
            <section className="dashboard-columns">
              <DashboardList title="Waiting queue" items={waitingPreview} empty="No customers are waiting." actionLabel="Accept" onOpen={(item) => { setView("chats"); setChatTab("waiting"); void loadConversation(item.id); }} onAction={acceptConversation} zone={displayTimezone} />
              <DashboardList title="My conversations" items={minePreview} empty="You have no active conversations." actionLabel="Open" onOpen={(item) => { setView("chats"); setChatTab("mine"); void loadConversation(item.id); }} onAction={(item) => { setView("chats"); setChatTab("mine"); return loadConversation(item.id); }} zone={displayTimezone} />
            </section>
            <section className="dashboard-help"><Headphones /><div><h3>Reliable live support is active</h3><p>Realtime delivery is backed by automatic message catch-up, so conversations continue through brief connection interruptions.</p></div></section>
          </div>
        )}

        {(view === "chats" || view === "archive") && (
          <div className="chat-workspace">
            <aside className="conversation-list">
              <div className="chat-tabs">{chatTabs.filter((item) => view !== "archive" || item.key === "closed").map((item) => <button key={item.key} className={chatTab === item.key ? "active" : ""} onClick={() => { setChatTab(item.key); setSelectedId(null); selectedRef.current = null; setDetail(null); }}>{item.label}</button>)}</div>
              <div className="list-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" /></div>
              <div className="conversation-cards">
                {filteredConversations.map((conversation) => <article key={conversation.id} className={selectedId === conversation.id ? "selected" : ""} onClick={() => loadConversation(conversation.id)}><div className="card-title"><span className="customer-avatar"><UserRound /></span><div><strong>{conversation.customer_display_name || conversation.customer_identifier || `Customer ${conversation.id}`}</strong><small>#{conversation.id}</small></div><time>{formatDate(conversation.last_message_at || conversation.queue_entered_at, displayTimezone)}</time></div><p>{conversation.last_message || conversation.handoff_reason?.replaceAll("_", " ") || "New conversation"}</p><div className="card-foot"><StatusPill value={conversation.status} /><span>{conversation.assigned_staff_name || "Unassigned"}</span>{chatTab === "waiting" && <button onClick={(event) => { event.stopPropagation(); void acceptConversation(conversation); }}>Accept</button>}</div></article>)}
                {!filteredConversations.length && <div className="empty-list">No conversations in this list.</div>}
              </div>
            </aside>

            <main className="conversation-panel">
              {detail ? <>
                <header className="conversation-header"><div><h2>{detail.conversation.customer_display_name || detail.conversation.customer_identifier || `Customer ${detail.conversation.id}`}</h2><p><StatusPill value={detail.conversation.status} /> {detail.conversation.control_mode === "HUMAN" ? "Representative-controlled" : detail.conversation.control_mode === "AI" ? "Brand support ready" : "Closed"}{aiState && <span className="ai-state"><Activity /> Automated response {aiState.toLowerCase()}</span>}</p></div><div className="conversation-tools"><button onClick={addNote}>Internal note</button>{canReply && <button onClick={transferConversation}><ArrowRightLeft /> Transfer</button>}{canReply && <button className="success" onClick={resolveConversation}><CheckCircle2 /> Resolve → Brand support</button>}</div></header>
                <div className="message-stream" ref={messagePaneRef}>{detail.messages.filter((message) => !message.is_internal).map((message) => <div key={message.id} className={`message-row ${message.sender_type.toLowerCase()}`}><div className="message-meta"><strong>{message.sender_name || message.sender_type}</strong><span>#{message.message_sequence || "—"} · {formatDate(message.created_at, displayTimezone)}</span></div><p>{message.body_text}</p>{message.sender_type === "STAFF" && <small className="delivery-state">{message.read_at ? "Read" : message.delivered_at ? "Delivered" : "Sent"}</small>}</div>)}{customerTyping && <div className="typing-line">Customer is typing…</div>}</div>
                <footer className="reply-composer"><div className="composer-tabs"><button className="active">Reply</button><button onClick={addNote}>Internal note</button></div><div className="composer-row"><textarea disabled={!canReply} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendReply(); } }} onInput={() => { const socket = socketRef.current; if (socket?.readyState === WebSocket.OPEN && detail) socket.send(JSON.stringify({ event: "support:typing", data: { conversation_id: detail.conversation.id, is_typing: true } })); }} placeholder={canReply ? "Type a reply…" : `Read-only — assigned to ${detail.conversation.assigned_staff_name || "another staff member"}`} /><button disabled={!canReply || !draft.trim()} onClick={sendReply}><Send /></button></div>{detail.conversation.status === "RESOLVED" && detail.conversation.control_mode === "AI" && <div className="returned-ai-notice"><Activity /> Resolved. The customer has returned to brand support.</div>}</footer>
              </> : <div className="empty-conversation"><MessageCircle /><h2>Select a conversation</h2><p>Messages will arrive here in real time without refreshing.</p></div>}
            </main>

            <aside className="customer-panel">
              {detail ? <>
                <div className="panel-tabs"><button className="active">Customer</button><button>Conversation</button><button>Shortcuts</button></div>
                <section><h3>Visitor information</h3><dl><dt>Customer</dt><dd>{detail.conversation.customer_display_name || detail.conversation.customer_identifier || "Not set"}</dd><dt>Locale</dt><dd>{detail.conversation.customer_locale || "Not set"}</dd><dt>Delivery</dt><dd>{socketState === "connected" ? "Realtime" : socketState === "offline" ? "Fallback syncing" : "Reconnecting"}</dd><dt>Started</dt><dd>{formatDate(detail.conversation.created_at || detail.conversation.queue_entered_at, displayTimezone)}</dd></dl></section>
                <section><h3>Conversation</h3><dl><dt>Handoff reason</dt><dd>{detail.conversation.handoff_reason?.replaceAll("_", " ") || "—"}</dd><dt>Assigned staff</dt><dd>{detail.conversation.assigned_staff_name || "Unassigned"}</dd><dt>Control mode</dt><dd>{detail.conversation.control_mode}</dd><dt>Last sequence</dt><dd>{detail.conversation.last_message_sequence || sequenceRef.current}</dd></dl></section>
                <section><h3>Internal notes</h3>{detail.notes.map((note) => <article className="note-card" key={note.id}><p>{note.note_text}</p><small>{note.author_name || "Staff"} · {formatDate(note.created_at, displayTimezone)}</small></article>)}{!detail.notes.length && <p className="muted">No internal notes.</p>}</section>
              </> : <section><h3>Staff availability</h3><p className="muted">Active staff can accept waiting customers and transfer requests. Invisible staff remain signed in but are not offered new work.</p></section>}
            </aside>
          </div>
        )}

        {view === "performance" && (
          <div className="performance-page"><section className="metric-grid"><Metric icon={Users} label="Conversations served" value={Number(performance.conversations_served || 0)} /><Metric icon={CheckCircle2} label="Resolved" value={Number(performance.resolved_conversations || 0)} /><Metric icon={Send} label="Replies" value={Number(performance.replies_sent || 0)} /><Metric icon={MessageCircle} label="Sentences" value={Number(performance.sentences_sent || 0)} /><Metric icon={Clock3} label="First response" value={formatDuration(performance.avg_first_response_seconds)} /><Metric icon={Activity} label="Handling time" value={formatDuration(performance.avg_conversation_seconds)} /></section><section className="performance-card"><h2>Today’s presence</h2><div className="presence-bars"><PresenceBar label="Active" seconds={Number((performance.presence as Record<string, unknown> | undefined)?.active || 0)} /><PresenceBar label="Invisible" seconds={Number((performance.presence as Record<string, unknown> | undefined)?.invisible || 0)} /><PresenceBar label="Idle" seconds={Number((performance.presence as Record<string, unknown> | undefined)?.idle || 0)} /></div><p>Replies are the primary activity metric. Sentence counts remain secondary and should not be used for automatic punishment or salary decisions.</p></section></div>
        )}
        </main>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return <article className="metric-card"><Icon /><div><span>{label}</span><strong>{value}</strong></div></article>;
}

function DashboardList({ title, items, empty, actionLabel, onOpen, onAction, zone }: { title: string; items: Conversation[]; empty: string; actionLabel: string; onOpen: (item: Conversation) => void; onAction: (item: Conversation) => void | Promise<unknown>; zone: string }) {
  return <section className="dashboard-list"><header><h2>{title}</h2><span>{items.length}</span></header>{items.map((item) => <article key={item.id} onClick={() => onOpen(item)}><div><strong>{item.customer_display_name || item.customer_identifier || `Customer ${item.id}`}</strong><p>{item.last_message || item.handoff_reason?.replaceAll("_", " ") || "New conversation"}</p><small>{formatDate(item.last_message_at || item.queue_entered_at, zone)} · {item.assigned_staff_name || "Unassigned"}</small></div><button onClick={(event) => { event.stopPropagation(); void onAction(item); }}>{actionLabel}</button></article>)}{!items.length && <p className="empty-list">{empty}</p>}</section>;
}

function PresenceBar({ label, seconds }: { label: string; seconds: number }) {
  const width = Math.min(100, Math.max(3, seconds / 288));
  return <div><span>{label}</span><div className="bar"><i style={{ width: `${width}%` }} /></div><strong>{formatDuration(seconds)}</strong></div>;
}
