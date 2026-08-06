import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Headphones,
  Image as ImageIcon,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  RefreshCw,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  ChatApiError,
  cancelCustomerHandoff,
  clearCustomerSupportSession,
  fetchChatContent,
  fetchChatPromotions,
  fetchPublicSupportSettings,
  fetchCustomerSupport,
  fetchOlderCustomerMessages,
  getCustomerSupportSession,
  getPlatformKey,
  requestHumanSupport,
  resumeCustomerConversation,
  sendChatMessage,
  sendCustomerSupportMessage,
  uploadCustomerSupportAttachment,
  saveCustomerSupportContext,
  syncCustomerSupport,
  openCustomerSupportStream,
  consumeSupportEventStream,
  type AiJobSummary,
  type ChatContent,
  type ChatPromotion,
  type ProcessingExperience,
  type ResponseBlock,
  type SupportConversation,
  type SupportMessage,
} from "@/lib/api";
import { getChatConfig, normalizeChatLocale } from "@/lib/chat-config";
import { ImageLightbox } from "@/components/ImageLightbox";

type Role = "user" | "assistant";
type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "offline";

interface Message {
  id: string;
  role: Role;
  content: string;
  images?: string[];
  blocks?: ResponseBlock[];
  error?: boolean;
  retryOf?: string;
  errorInfo?: string;
  senderName?: string;
  senderType?: SupportMessage["sender_type"];
  sequence?: number;
  clientMessageId?: string;
  deliveredAt?: string;
  readAt?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentContentType?: string;
  attachmentSizeBytes?: number;
}

interface CustomerRealtimeSession {
  token: string;
  publicId: string;
  conversationId: number;
  status: string;
  controlMode: string;
  handoffReason?: string;
  assignedStaffName?: string;
  lastSequence: number;
  returnToAiOnResolve: boolean;
  version: number;
}

interface ActiveJob extends AiJobSummary {
  processing: ProcessingExperience;
  queuedAt: number;
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

function supportMessageToUi(item: SupportMessage): Message {
  const blocks = Array.isArray(item.metadata?.response_blocks) ? item.metadata?.response_blocks : undefined;
  const images = Array.isArray(item.metadata?.content_images) ? item.metadata?.content_images : undefined;
  return {
    id: `support-${item.id}`,
    role: item.sender_type === "CUSTOMER" ? "user" : "assistant",
    content: cleanDisplayText(item.body_text),
    senderName: item.sender_name || item.sender_type,
    senderType: item.sender_type,
    sequence: Number(item.message_sequence || 0),
    clientMessageId: item.client_message_id || undefined,
    deliveredAt: item.delivered_at,
    readAt: item.read_at,
    blocks,
    images,
    attachmentUrl: item.attachment_url || undefined,
    attachmentName: item.attachment_name || undefined,
    attachmentContentType: item.attachment_content_type || undefined,
    attachmentSizeBytes: item.attachment_size_bytes || undefined,
  };
}

function mergeSupportMessage(current: Message[], item: SupportMessage) {
  if (item.is_internal) return current;
  const next = supportMessageToUi(item);
  const filtered = current.filter((message) => {
    if (message.id === next.id) return false;
    if (next.clientMessageId && message.clientMessageId === next.clientMessageId) return false;
    return true;
  });
  return [...filtered, next].sort((left, right) => {
    const a = Number(left.sequence || Number.MAX_SAFE_INTEGER);
    const b = Number(right.sequence || Number.MAX_SAFE_INTEGER);
    return a - b;
  });
}

function sessionFromConversation(token: string, conversation: SupportConversation): CustomerRealtimeSession {
  return {
    token,
    publicId: conversation.public_id,
    conversationId: Number(conversation.id),
    status: conversation.status,
    controlMode: conversation.control_mode || "AI",
    handoffReason: conversation.handoff_reason,
    assignedStaffName: conversation.assigned_staff_name,
    lastSequence: Number(conversation.last_message_sequence || 0),
    returnToAiOnResolve: conversation.return_to_ai_on_resolve !== false,
    version: Number(conversation.version || 1),
  };
}

function processingLabel(job: ActiveJob | undefined, count: number, secondary: boolean) {
  if (!job) return "";
  const base = secondary && job.processing.secondary_message
    ? job.processing.secondary_message
    : job.processing.message || "Your answer is being prepared. Please give us a moment…";
  return count > 1 ? `${base} (${count} answers queued)` : base;
}

function AsyncProcessingIndicator({ jobs }: { jobs: ActiveJob[] }) {
  const job = jobs[0];
  const [visible, setVisible] = useState(false);
  const [secondary, setSecondary] = useState(false);
  useEffect(() => {
    setVisible(false);
    setSecondary(false);
    if (!job || job.processing.enabled === false) return;
    const elapsed = Math.max(0, Date.now() - job.queuedAt);
    const firstDelay = Math.max(0, Number(job.processing.show_after_ms || 700) - elapsed);
    const secondDelay = Math.max(firstDelay, Number(job.processing.secondary_after_ms || 8000) - elapsed);
    const maxDelay = Math.max(firstDelay + 1000, Number(job.processing.max_visible_ms || 45000) - elapsed);
    const first = window.setTimeout(() => setVisible(true), firstDelay);
    const second = window.setTimeout(() => { setVisible(true); setSecondary(true); }, secondDelay);
    const maximum = window.setTimeout(() => setVisible(false), maxDelay);
    return () => { window.clearTimeout(first); window.clearTimeout(second); window.clearTimeout(maximum); };
  }, [job?.id, job?.status, job?.queuedAt, job?.processing.show_after_ms, job?.processing.secondary_after_ms, job?.processing.max_visible_ms]);
  if (!job || !visible) return null;
  return (
    <div className="flex justify-start msg-in" aria-live="polite">
      <div className="ai-processing-card max-w-[88%] rounded-2xl rounded-bl-sm border border-border bg-bubble-ai px-4 py-3 text-sm text-bubble-ai-foreground">
        <div className="flex items-center gap-2">
          <span className="typing-dot" />
          <span>{processingLabel(job, jobs.length, secondary)}</span>
        </div>
      </div>
    </div>
  );
}

type CustomerUiCopy = { online:string; reconnecting:string; waiting:string; representative:string; queue:string; cancelQueue:string; resolved:string; newMessages:(count:number)=>string; typing:string; closed:string };
function customerUiCopy(locale: string): CustomerUiCopy {
  const code=String(locale || "en").toLowerCase().split("-")[0];
  const copy: Record<string,CustomerUiCopy> = {
    en:{ online:"Online",reconnecting:"Reconnecting…",waiting:"Waiting for a representative",representative:"Customer service representative connected",queue:"Your request is in the queue",cancelQueue:"Cancel request and continue here",resolved:"Your customer-service request has been resolved. You can continue chatting here.",newMessages:(count)=>`↓ ${count} new message${count === 1 ? "" : "s"}`,typing:"Customer service is typing…",closed:"This conversation is closed" },
    my:{ online:"အွန်လိုင်း",reconnecting:"ပြန်လည်ချိတ်ဆက်နေသည်…",waiting:"ဝန်ထမ်းတစ်ဦးကို စောင့်ဆိုင်းနေသည်",representative:"ဖောက်သည်ဝန်ဆောင်မှု ဝန်ထမ်း ချိတ်ဆက်ပြီးပါပြီ",queue:"သင့်တောင်းဆိုချက် စောင့်ဆိုင်းစာရင်းထဲ ရှိနေပါတယ်",cancelQueue:"တောင်းဆိုချက်ပယ်ဖျက်ပြီး ဒီနေရာမှာ ဆက်ပြောမယ်",resolved:"ဖောက်သည်ဝန်ဆောင်မှုတောင်းဆိုချက် ဖြေရှင်းပြီးပါပြီ။ ဒီနေရာမှာ ဆက်ပြောနိုင်ပါတယ်။",newMessages:(count)=>`↓ မက်ဆေ့ချ်အသစ် ${count} ခု`,typing:"ဖောက်သည်ဝန်ဆောင်မှုက စာရိုက်နေသည်…",closed:"ဒီစကားဝိုင်း ပိတ်ထားပါပြီ" },
    id:{ online:"Online",reconnecting:"Menyambungkan kembali…",waiting:"Menunggu perwakilan",representative:"Perwakilan layanan pelanggan terhubung",queue:"Permintaan Anda ada dalam antrean",cancelQueue:"Batalkan permintaan dan lanjutkan di sini",resolved:"Permintaan layanan pelanggan Anda telah diselesaikan. Anda dapat melanjutkan percakapan di sini.",newMessages:(count)=>`↓ ${count} pesan baru`,typing:"Layanan pelanggan sedang mengetik…",closed:"Percakapan ini ditutup" },
    zh:{ online:"在线",reconnecting:"正在重新连接…",waiting:"正在等待客服人员",representative:"客服人员已连接",queue:"您的请求正在队列中",cancelQueue:"取消请求并继续聊天",resolved:"客服请求已处理完成，您可以继续在这里聊天。",newMessages:(count)=>`↓ ${count} 条新消息`,typing:"客服正在输入…",closed:"此对话已关闭" },
    hi:{ online:"ऑनलाइन",reconnecting:"फिर से कनेक्ट हो रहा है…",waiting:"प्रतिनिधि की प्रतीक्षा",representative:"ग्राहक-सेवा प्रतिनिधि जुड़ गया",queue:"आपका अनुरोध कतार में है",cancelQueue:"अनुरोध रद्द करें और यहाँ जारी रखें",resolved:"ग्राहक-सेवा अनुरोध हल हो गया है। आप यहाँ बातचीत जारी रख सकते हैं।",newMessages:(count)=>`↓ ${count} नए संदेश`,typing:"ग्राहक सेवा टाइप कर रही है…",closed:"यह बातचीत बंद है" },
  };
  return copy[code] || copy.en;
}

export default function App() {
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasOlderMessages,setHasOlderMessages]=useState(false);
  const [loadingOlder,setLoadingOlder]=useState(false);
  const [usedQuickReplies, setUsedQuickReplies] = useState<Set<string>>(() => new Set());
  const [input, setInput] = useState("");
  const [content, setContent] = useState<ChatContent | null>(null);
  const [promotions, setPromotions] = useState<ChatPromotion[]>([]);
  const [promotionIndex, setPromotionIndex] = useState(0);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [customerAttachmentsEnabled,setCustomerAttachmentsEnabled]=useState(false);
  const [started, setStarted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [waitHint, setWaitHint] = useState(false);
  const [supportSession, setSupportSession] = useState<CustomerRealtimeSession | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [fallbackHealthy,setFallbackHealthy]=useState(true);
  const [pollIntervalMs, setPollIntervalMs] = useState(2500);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [staffTyping, setStaffTyping] = useState(false);
  const [activeJobs, setActiveJobs] = useState<Record<number, ActiveJob>>({});
  const [defaultProcessing, setDefaultProcessing] = useState<ProcessingExperience>({
    enabled: true,
    message: "Your answer is being prepared. Please give us a moment…",
    secondary_message: "Your answer is still being prepared…",
    show_after_ms: 700,
    secondary_after_ms: 8000,
    max_visible_ms: 45000,
    allow_additional_messages: true,
  });

  const platformKey = getPlatformKey();
  const effectiveLanguage = normalizeChatLocale(content?.default_locale, "en");
  const chatConfig = getChatConfig(effectiveLanguage, platformKey);
  const uiCopy = customerUiCopy(effectiveLanguage);
  const dynamicTexts = content?.texts?.[effectiveLanguage] || content?.texts?.[effectiveLanguage.split("-")[0]] || {};
  const startModule = content?.start_module;
  const startEnabled = Boolean(content && startModule?.enabled !== false);
  const headerTitle = content?.branding?.title || dynamicTexts.title || chatConfig.chatTitle;
  const onlineText = content?.branding?.online || dynamicTexts.online || chatConfig.onlineLabel;
  const welcomeTitle = dynamicTexts.welcome_title || chatConfig.welcomeTitle;
  const welcomeText = dynamicTexts.welcome || chatConfig.welcomeText;
  const iconUrl = content?.branding?.chat_icon_url || "";
  const quickQuestions = content ? (content.quick_replies || []).slice(0, 5).map((q) => q.query || q.text) : [];
  const visibleQuickQuestions = quickQuestions.filter((question) => !usedQuickReplies.has(question));
  const actionButtons = content?.action_buttons || [];
  const layout = safePreset(startModule?.layout || content?.settings?.chat_layout, SAFE_LAYOUTS, "standard");
  const bubbleStyle = safePreset(startModule?.bubble_style || content?.settings?.chat_bubble_style, SAFE_BUBBLES, "soft");
  const inputStyle = safePreset(startModule?.input_style || content?.settings?.chat_input_style, SAFE_INPUTS, "rounded");
  const backgroundUrl = safeVisualUrl(startModule?.background_url || content?.settings?.chat_background_url);
  const themeStyle = {
    "--brand": content?.settings?.accent_color || undefined,
    "--primary": content?.settings?.accent_color || undefined,
    "--ring": content?.settings?.accent_color || undefined,
    "--surface": content?.settings?.surface_color || undefined,
    "--background-image": backgroundUrl ? `url(${JSON.stringify(backgroundUrl)})` : undefined,
    fontFamily: safeFontFamily(content?.settings?.font_family),
  } as React.CSSProperties;

  const processingRef = useRef(defaultProcessing);
  processingRef.current = defaultProcessing;
  const streamAbortRef = useRef<AbortController | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const reconnectAttempt = useRef(0);
  const streamGeneration = useRef(0);
  const lastSequenceRef = useRef(0);
  const nearBottomRef = useRef(true);
  const initialAnchorRef = useRef(false);
  const syncInFlightRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const humanControlled = Boolean(supportSession && (supportSession.controlMode === "HUMAN" || ["WAITING_FOR_AGENT", "ASSIGNED", "AGENT_ACTIVE", "TRANSFER_REQUESTED"].includes(supportSession.status)));
  const closed = supportSession?.controlMode === "CLOSED" || supportSession?.status === "CLOSED";
  const jobs = useMemo(() => Object.values(activeJobs).sort((a, b) => a.queuedAt - b.queuedAt || a.id - b.id), [activeJobs]);
  const allowAdditionalMessages = false;
  const composerDisabled = closed || isSending || jobs.length > 0 || uploadingAttachment;
  const humanAttachmentsAllowed = Boolean(customerAttachmentsEnabled && supportSession && supportSession.controlMode === "HUMAN" && ["ASSIGNED","AGENT_ACTIVE","TRANSFER_REQUESTED"].includes(supportSession.status));
  const promotionTheme = content?.settings || {};
  const displayPromotions = promotions.filter((item)=>messages.length===0&&!started ? ["welcome","before_first_message"].includes(String(item.placement||"welcome")) : String(item.placement||"welcome")==="conversation_top");
  const showPromotions = Boolean(promotionTheme.promotion_enabled && displayPromotions.length > 0 && !(humanControlled && promotionTheme.promotion_hide_during_human !== false));

  const updateSession = useCallback((conversation: SupportConversation, tokenValue?: string) => {
    setSupportSession((current) => sessionFromConversation(tokenValue || current?.token || "", conversation));
    lastSequenceRef.current = Math.max(lastSequenceRef.current, Number(conversation.last_message_sequence || 0));
  }, []);

  const ingestMessage = useCallback((item: SupportMessage) => {
    if (item.is_internal) return;
    const incoming = item.sender_type !== "CUSTOMER";
    if (incoming && !nearBottomRef.current && !initialAnchorRef.current) setNewMessageCount((count) => count + 1);
    setMessages((current) => mergeSupportMessage(current, item));
    lastSequenceRef.current = Math.max(lastSequenceRef.current, Number(item.message_sequence || 0));
    setSupportSession((current) => current ? { ...current, lastSequence: Math.max(current.lastSequence, Number(item.message_sequence || 0)) } : current);
    if (item.sender_type === "AI") {
      setActiveJobs((current) => {
        const next = { ...current };
        if (item.ai_job_id) delete next[item.ai_job_id];
        else {
          const oldest = Object.values(next).sort((a, b) => a.queuedAt - b.queuedAt)[0];
          if (oldest) delete next[oldest.id];
        }
        return next;
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setUsedQuickReplies(new Set());
    fetchChatContent(platformKey, controller.signal).then(setContent).catch(() => null);
    fetchChatPromotions(platformKey, controller.signal).then((data)=>setPromotions(data.items || [])).catch(()=>setPromotions([]));
    fetchPublicSupportSettings(platformKey,controller.signal).then((data)=>setCustomerAttachmentsEnabled(data.support?.attachments?.customer_enabled===true)).catch(()=>setCustomerAttachmentsEnabled(false));
    return () => controller.abort();
  }, [platformKey]);

  useEffect(() => {
    if (!showPromotions || displayPromotions.length < 2 || promotionTheme.promotion_autoplay === false) return;
    const timer=window.setInterval(()=>setPromotionIndex((index)=>promotionTheme.promotion_loop === false && index >= displayPromotions.length-1 ? index : (index+1)%displayPromotions.length),Math.max(2500,Number(promotionTheme.promotion_interval_ms || 5000)));
    return ()=>window.clearInterval(timer);
  },[showPromotions,displayPromotions.length,promotionTheme.promotion_autoplay,promotionTheme.promotion_interval_ms,promotionTheme.promotion_loop]);

  useEffect(() => {
    const saved = getCustomerSupportSession(platformKey);
    if (!saved) return;
    let disposed=false;
    const restore=async () => {
      try {
        const data=await resumeCustomerConversation(platformKey);
        if (disposed) return;
        const session=sessionFromConversation(data.support_token,data.conversation);
        setSupportSession(session);
        setPollIntervalMs(Math.max(1500,Number(data.poll_interval_ms || 2500)));
        lastSequenceRef.current=Number(data.conversation.last_message_sequence || 0);
        const restored=(data.messages || []).filter((item)=>!item.is_internal).map(supportMessageToUi);
        setMessages(restored); setHasOlderMessages(Boolean((data as any).has_older_messages));
        setStarted(restored.length > 0);
        initialAnchorRef.current=true;
        const active=Array.isArray(data.active_ai_jobs) ? data.active_ai_jobs : [];
        setActiveJobs(Object.fromEntries(active.map((job)=>[Number(job.id),{ ...job,processing:processingRef.current,queuedAt:Date.parse(job.created_at || "") || Date.now() }])))
      } catch (error) {
        if (disposed) return;
        if (saved.token) {
          try {
            const data=await fetchCustomerSupport(saved.publicId,saved.token);
            if (disposed) return;
            setSupportSession(sessionFromConversation(saved.token,data.conversation));
            const restored=(data.messages || []).filter((item)=>!item.is_internal).map(supportMessageToUi);
            setMessages(restored); setHasOlderMessages(Boolean((data as any).has_older_messages)); setStarted(restored.length > 0); initialAnchorRef.current=true;
            lastSequenceRef.current=Number(data.conversation.last_message_sequence || 0);
            return;
          } catch {}
        }
        if (error instanceof ChatApiError && [401,404].includes(error.status)) clearCustomerSupportSession(platformKey);
      }
    };
    void restore();
    return ()=>{ disposed=true; };
  }, [platformKey]);

  useEffect(() => {
    if (!supportSession?.token || !supportSession.publicId) return;
    const generation=++streamGeneration.current;
    let disposed=false;
    const controller=new AbortController();
    streamAbortRef.current=controller;
    const handlePacket=(packet:{ event:string; data:Record<string,any> })=>{
      const data=packet.data || {};
      if (packet.event === "session") {
        if (data.conversation) updateSession(data.conversation);
        for (const item of (data.messages || []) as SupportMessage[]) ingestMessage(item);
        const active=Array.isArray(data.active_ai_jobs) ? data.active_ai_jobs : [];
        setActiveJobs(Object.fromEntries((active as AiJobSummary[]).map((job)=>[Number(job.id),{ ...job,processing:processingRef.current,queuedAt:Date.parse(job.created_at || "") || Date.now() }])));
        return;
      }
      if (packet.event === "message.created" && data.message) ingestMessage(data.message as SupportMessage);
      if (["response.queued","response.processing"].includes(packet.event)) {
        const id=Number(data.job_id || 0);
        if (id) setActiveJobs((current)=>({ ...current,[id]:{ ...(current[id] || { id,queuedAt:Date.now(),processing:data.processing || processingRef.current }),id,status:data.status || current[id]?.status || "PROCESSING",attempt_count:Number(data.attempt_count || current[id]?.attempt_count || 0),processing:data.processing || current[id]?.processing || processingRef.current } }));
      }
      if (["response.completed","response.failed","response.cancelled"].includes(packet.event)) {
        const id=Number(data.job_id || 0); if (id) setActiveJobs((current)=>{ const next={ ...current }; delete next[id]; return next; });
      }
      if (packet.event === "conversation.assigned") setSupportSession((current)=>current ? { ...current,status:"AGENT_ACTIVE",controlMode:"HUMAN",assignedStaffName:data.staff?.display_name || data.conversation?.assigned_staff_name || current.assignedStaffName,version:Number(data.conversation?.version || current.version) } : current);
      if (packet.event === "conversation.resolved") { if (data.conversation) updateSession(data.conversation); else setSupportSession((current)=>current ? { ...current,status:"AI_ACTIVE",controlMode:data.return_to_ai === false ? "CLOSED" : "AI",assignedStaffName:"",version:current.version+1 } : current); setActiveJobs({}); }
      if (packet.event === "message.state" && data.actor === "staff") { const through=Number(data.through_sequence || 0); setMessages((current)=>current.map((message)=>message.role === "user" && Number(message.sequence || 0) <= through ? { ...message,deliveredAt:data.updated_at || message.deliveredAt,readAt:data.state === "read" ? (data.updated_at || message.readAt) : message.readAt } : message)); }
      if (packet.event === "conversation.typing" && data.actor === "staff") { setStaffTyping(data.is_typing === true); if (data.is_typing) window.setTimeout(()=>setStaffTyping(false),5000); }
    };
    const connect=async()=>{
      while (!disposed && generation===streamGeneration.current && !controller.signal.aborted) {
        setConnectionState(reconnectAttempt.current > 0 ? "reconnecting" : "connecting");
        try {
          const response=await openCustomerSupportStream(supportSession.publicId,supportSession.token,lastSequenceRef.current,controller.signal);
          if (disposed || generation!==streamGeneration.current) return;
          reconnectAttempt.current=0;
          setConnectionState("connected");
          setFallbackHealthy(true);
          await consumeSupportEventStream(response,handlePacket,controller.signal);
        } catch (error) {
          if (controller.signal.aborted || disposed) return;
          setConnectionState("reconnecting");
        }
        const attempt=Math.min(8,reconnectAttempt.current++);
        const delay=Math.min(15000,750*2**attempt)+Math.floor(Math.random()*300);
        await new Promise((resolve)=>{ reconnectTimer.current=window.setTimeout(resolve,delay); });
      }
    };
    void connect();
    return ()=>{ disposed=true; controller.abort(); if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current); if (streamAbortRef.current===controller) streamAbortRef.current=null; setConnectionState("disconnected"); };
  }, [supportSession?.token,supportSession?.publicId,ingestMessage,updateSession]);

  useEffect(() => {
    if (!supportSession?.token || !supportSession.publicId) return;
    let disposed=false;
    const sync=async () => {
      if (disposed || syncInFlightRef.current) return;
      syncInFlightRef.current=true;
      try {
        const data=await syncCustomerSupport(supportSession.publicId,supportSession.token,lastSequenceRef.current);
        if (disposed) return;
        updateSession(data.conversation);
        setFallbackHealthy(true);
        setPollIntervalMs(Math.max(1500,Number(data.poll_interval_ms || pollIntervalMs || 2500)));
        for (const item of data.messages || []) ingestMessage(item);
        const active=Array.isArray(data.active_ai_jobs) ? data.active_ai_jobs : data.active_ai_job ? [data.active_ai_job] : [];
        const activeIds=new Set(active.map((job)=>Number(job.id)));
        setActiveJobs((current)=>{
          const next:Record<number,ActiveJob>={};
          for (const job of active) next[Number(job.id)]={ ...job,processing:current[Number(job.id)]?.processing || processingRef.current,queuedAt:current[Number(job.id)]?.queuedAt || Date.parse(job.created_at || "") || Date.now() };
          for (const [id,job] of Object.entries(current)) if (activeIds.has(Number(id))) next[Number(id)]=next[Number(id)] || job;
          return next;
        });
      } catch (error) {
        if (error instanceof ChatApiError && error.status === 401) {
          try {
            const resumed=await resumeCustomerConversation(platformKey);
            if (!disposed) { setSupportSession(sessionFromConversation(resumed.support_token,resumed.conversation)); setPollIntervalMs(Math.max(1500,Number(resumed.poll_interval_ms || 2500))); setFallbackHealthy(true); }
          } catch { if (!disposed) setFallbackHealthy(false); }
        } else if (!disposed) setFallbackHealthy(false);
      } finally { syncInFlightRef.current=false; }
    };
    void sync();
    const interval=window.setInterval(()=>void sync(),connectionState === "connected" ? 12000 : pollIntervalMs);
    const onVisible=()=>{ if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange",onVisible);
    window.addEventListener("online",onVisible);
    return ()=>{ disposed=true; window.clearInterval(interval); document.removeEventListener("visibilitychange",onVisible); window.removeEventListener("online",onVisible); };
  }, [supportSession?.token,supportSession?.publicId,connectionState,pollIntervalMs,platformKey,ingestMessage,updateSession]);

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
    } else if (existing) existing.remove();
  }, [content?.branding?.favicon_url, headerTitle, platformKey]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el=scrollRef.current; if (!el) return;
    requestAnimationFrame(()=>{ el.scrollTo({ top:el.scrollHeight,behavior }); nearBottomRef.current=true; setNewMessageCount(0); });
  },[]);
  const handleScroll=useCallback(()=>{ const el=scrollRef.current; if (!el) return; nearBottomRef.current=el.scrollHeight-el.scrollTop-el.clientHeight < 120; if (nearBottomRef.current) setNewMessageCount(0); },[]);
  const handleMediaLoad=useCallback(()=>{ if (nearBottomRef.current || initialAnchorRef.current) scrollToBottom("auto"); },[scrollToBottom]);
  useEffect(()=>{
    if (initialAnchorRef.current) {
      const first=window.setTimeout(()=>scrollToBottom("auto"),20); const second=window.setTimeout(()=>{ scrollToBottom("auto"); initialAnchorRef.current=false; },280);
      return ()=>{ window.clearTimeout(first); window.clearTimeout(second); };
    }
    if (nearBottomRef.current) scrollToBottom("smooth");
  },[messages,jobs.length,staffTyping,scrollToBottom]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || closed) return;
    if (composerDisabled) {
      setWaitHint(true);
      window.setTimeout(() => setWaitHint(false), 2200);
      return;
    }
    setStarted(true);
    setInput("");
    setIsSending(true);
    const clientMessageId = crypto.randomUUID();
    const pendingId = `pending-${clientMessageId}`;
    setMessages((current) => [...current, { id: pendingId, role: "user", content: trimmed, clientMessageId }]);
    try {
      if (humanControlled && supportSession) {
        try {
          const sent=await sendCustomerSupportMessage(supportSession.publicId,supportSession.token,trimmed,clientMessageId);
          ingestMessage(sent.message);
        } catch (error) {
          if (error instanceof ChatApiError && error.code === "SUPPORT_RETURNED_TO_BRAND") {
            const resumed=await resumeCustomerConversation(platformKey);
            updateSession(resumed.conversation,resumed.support_token);
            const accepted=await sendChatMessage(trimmed,effectiveLanguage,platformKey,clientMessageId);
            updateSession(accepted.conversation,accepted.support_token); ingestMessage(accepted.message);
            if (accepted.ai_job) setActiveJobs((current)=>({ ...current,[Number(accepted.ai_job!.id)]:{ ...accepted.ai_job!,processing:accepted.processing || defaultProcessing,queuedAt:Date.now() } }));
          } else throw error;
        }
      } else {
        const accepted = await sendChatMessage(trimmed, effectiveLanguage, platformKey, clientMessageId);
        updateSession(accepted.conversation, accepted.support_token);
        ingestMessage(accepted.message);
        const processing = accepted.processing || defaultProcessing;
        setDefaultProcessing(processing);
        if (accepted.ai_job) {
          const jobId = Number(accepted.ai_job.id);
          setActiveJobs((current) => ({
            ...current,
            [jobId]: { ...accepted.ai_job!, processing, queuedAt: Date.now() },
          }));
        }
      }
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== pendingId).concat({
        id: uid(),
        role: "assistant",
        content: chatConfig.fallbackMessage,
        error: true,
        retryOf: trimmed,
        errorInfo: undefined,
      }));
    } finally {
      setIsSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [chatConfig.fallbackMessage, closed, composerDisabled, defaultProcessing, effectiveLanguage, humanControlled, ingestMessage, platformKey, supportSession, updateSession]);

  const startHumanSupport = useCallback(async (reason?: string) => {
    if (isSending || humanControlled || closed) return;
    setIsSending(true);
    try {
      const handoff = await requestHumanSupport(platformKey, effectiveLanguage, reason);
      updateSession(handoff.conversation, handoff.support_token);
      setPollIntervalMs(Math.max(1500,Number(handoff.poll_interval_ms || 2500)));
      setActiveJobs({});
    } catch (error) {
      setMessages((current) => [...current, { id: uid(), role: "assistant", content: error instanceof Error ? error.message : chatConfig.fallbackMessage, error: true }]);
    } finally {
      setIsSending(false);
    }
  }, [chatConfig.fallbackMessage, closed, effectiveLanguage, humanControlled, isSending, platformKey, updateSession]);

  const connectionCopy=(connectionState === "reconnecting" || connectionState === "connecting") && !fallbackHealthy ? uiCopy.reconnecting : (onlineText || uiCopy.online);
  useEffect(()=>{
    if (!supportSession?.token || !supportSession.publicId) return;
    void saveCustomerSupportContext(supportSession.publicId,supportSession.token).catch(()=>null);
  },[supportSession?.publicId,supportSession?.token]);

  const uploadAttachment=useCallback(async(file:File)=>{
    if (!supportSession || !humanAttachmentsAllowed || uploadingAttachment) return;
    setUploadingAttachment(true);
    try { const result=await uploadCustomerSupportAttachment(supportSession.publicId,supportSession.token,file); if (result.message) ingestMessage(result.message); }
    catch (error) { setMessages((current)=>[...current,{ id:`upload-error-${uid()}`,role:"assistant",content:error instanceof Error?error.message:"File upload failed",error:true }]); }
    finally { setUploadingAttachment(false); if (fileInputRef.current) fileInputRef.current.value=""; }
  },[humanAttachmentsAllowed,ingestMessage,supportSession,uploadingAttachment]);

  const loadOlder=useCallback(async()=>{
    if(!supportSession || loadingOlder || !hasOlderMessages) return;
    const oldest=Math.min(...messages.map((m)=>Number(m.sequence||Number.MAX_SAFE_INTEGER)));
    if(!Number.isFinite(oldest)) return;
    const viewport=scrollRef.current; const beforeHeight=viewport?.scrollHeight||0;
    setLoadingOlder(true);
    try{ const page=await fetchOlderCustomerMessages(supportSession.publicId,supportSession.token,oldest,10); const older=(page.messages||[]).filter((m)=>!m.is_internal).map(supportMessageToUi); setMessages((current)=>{const ids=new Set(current.map((m)=>m.id));return [...older.filter((m)=>!ids.has(m.id)),...current];}); setHasOlderMessages(Boolean(page.has_older_messages)); requestAnimationFrame(()=>{if(viewport)viewport.scrollTop+=(viewport.scrollHeight-beforeHeight);}); }catch{}finally{setLoadingOlder(false);}
  },[supportSession,loadingOlder,hasOlderMessages,messages]);

  const modeCopy=closed ? uiCopy.closed : humanControlled ? (supportSession?.status === "WAITING_FOR_AGENT" ? uiCopy.waiting : uiCopy.representative) : uiCopy.online;

  const leaveQueue=useCallback(async()=>{
    if (!supportSession || supportSession.status !== "WAITING_FOR_AGENT") return;
    try { const result=await cancelCustomerHandoff(supportSession.publicId,supportSession.token); updateSession(result.conversation); }
    catch {}
  },[supportSession,updateSession]);


  return (
    <div className="min-h-[100dvh] w-full bg-background flex justify-center" style={themeStyle}>
      <div className={`chat-layout-${layout} chat-bubbles-${bubbleStyle} chat-input-${inputStyle} flex flex-col w-full max-w-[440px] min-h-[100dvh] relative bg-background/95 ${backgroundUrl ? "chat-background-image" : ""}`}>
        <header className="sticky top-0 z-20 backdrop-blur-md bg-background/85 border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand text-brand-foreground grid place-items-center font-bold shadow-sm overflow-hidden">
                  {iconUrl ? <img src={iconUrl} alt={`${headerTitle} logo`} className="h-full w-full object-cover" /> : platformKey === "default" ? <Sparkles className="w-5 h-5" /> : <span className="text-xs font-bold">?</span>}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${connectionState === "connected" || fallbackHealthy || !supportSession ? "bg-emerald-400" : "bg-amber-400"}`} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{headerTitle}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span>{connectionCopy}</span>
                  {humanControlled && <><span>·</span><span>{modeCopy}</span></>}
                </div>
              </div>
            </div>

          </div>
          {humanControlled && (
            <div className="chat-mode-strip human">
              <Headphones className="h-3.5 w-3.5" />
              <span>{modeCopy}</span>
              {supportSession?.status === "WAITING_FOR_AGENT" && <button type="button" className="ml-auto text-[10px] underline underline-offset-2" onClick={()=>void leaveQueue()}>{uiCopy.cancelQueue}</button>}
            </div>
          )}
        </header>

        <div ref={scrollRef} onScroll={handleScroll} className="chat-scroll flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {hasOlderMessages && <button type="button" disabled={loadingOlder} onClick={()=>void loadOlder()} className="mx-auto block rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold disabled:opacity-50">{loadingOlder?"Loading…":"Show previous messages"}</button>}
          {showPromotions && <PromotionCarousel items={displayPromotions} index={Math.min(promotionIndex,displayPromotions.length-1)} setIndex={setPromotionIndex} theme={promotionTheme} />}
          {startEnabled && !started && messages.length === 0 ? (
            <ChatStartModule module={startModule} iconUrl={iconUrl} actionButtons={actionButtons} onStart={() => { setStarted(true); setTimeout(() => inputRef.current?.focus(), 30); }} onPrompt={send} />
          ) : (
            <section className="rounded-2xl bg-gradient-to-br from-surface-elevated to-surface border border-border p-4 msg-in">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0 overflow-hidden">{iconUrl ? <img src={iconUrl} alt="" className="h-full w-full object-cover" /> : <Sparkles className="w-5 h-5" />}</div>
                <div className="min-w-0"><h2 className="font-semibold text-sm">{welcomeTitle}</h2><p className="text-xs text-muted-foreground mt-1 leading-relaxed">{welcomeText}</p></div>
              </div>
            </section>
          )}
          {messages.map((message) => <MessageBubble key={message.id} message={message} onRetry={() => message.retryOf && send(message.retryOf)} onPrompt={send} onPreview={(src, alt) => setPreview({ src, alt })} onHandoff={startHumanSupport} onMediaLoad={handleMediaLoad} />)}
          <AsyncProcessingIndicator jobs={jobs} />
          {staffTyping && humanControlled && <div className="text-xs text-muted-foreground px-2">{uiCopy.typing}</div>}
          {newMessageCount > 0 && <button type="button" onClick={()=>scrollToBottom("smooth")} className="sticky bottom-2 mx-auto block rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-lg">{uiCopy.newMessages(newMessageCount)}</button>}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-md px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {waitHint && <div className="text-[11px] text-muted-foreground px-2 pb-1">{jobs.length ? "Preparing your response…" : chatConfig.waitInlineNote}</div>}
          {visibleQuickQuestions.length > 0 && !humanControlled && (
            <div className="mb-2 flex flex-wrap gap-2" aria-label="Quick replies">
              {visibleQuickQuestions.map((question) => <button key={question} type="button" disabled={composerDisabled} onClick={() => { setUsedQuickReplies((previous) => new Set(previous).add(question)); void send(question); }} className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{question}</button>)}
            </div>
          )}
          <div className="flex items-end gap-2">
            {humanAttachmentsAllowed && <>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" className="hidden" onChange={(event)=>{const file=event.target.files?.[0]; if(file) void uploadAttachment(file);}} />
              <button type="button" disabled={uploadingAttachment} onClick={()=>fileInputRef.current?.click()} aria-label="Attach image or file" className="shrink-0 w-10 h-10 rounded-full border border-border bg-surface grid place-items-center hover:bg-accent disabled:opacity-50"><Paperclip className="h-4 w-4" /></button>
            </>}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }}
              disabled={composerDisabled}
              placeholder={closed ? uiCopy.closed : humanControlled ? "Message customer service…" : jobs.length ? "Preparing your response…" : dynamicTexts.placeholder || chatConfig.placeholderIdle}
              className="flex-1 resize-none max-h-32 rounded-2xl bg-surface border border-border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 placeholder:text-muted-foreground"
              style={{ minHeight: "42px" }}
            />
            <button type="submit" disabled={composerDisabled || !input.trim()} aria-label="Send message" className="shrink-0 w-11 h-11 rounded-full bg-brand text-brand-foreground grid place-items-center hover:bg-brand-glow disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"><Send className="w-4.5 h-4.5" strokeWidth={2.25} /></button>
          </div>
        </form>
      </div>
      {preview && <ImageLightbox src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} />}
    </div>
  );
}

function ChatStartModule({
  module,
  iconUrl,
  actionButtons,
  onStart,
  onPrompt,
}: {
  module?: ChatContent["start_module"];
  iconUrl: string;
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

function PromotionCarousel({ items,index,setIndex,theme }:{ items:ChatPromotion[];index:number;setIndex:(index:number)=>void;theme:NonNullable<ChatContent["settings"]> }) {
  const item=items[index]; if(!item) return null;
  const previous=()=>setIndex((index-1+items.length)%items.length); const next=()=>setIndex((index+1)%items.length);
  const card=<div className="relative overflow-hidden border border-border bg-surface shadow-sm" style={{borderRadius:Math.max(0,Number(theme.promotion_border_radius || 16))}}><img src={item.image_url} alt={item.title || "Promotion"} className="w-full object-cover" style={{height:`clamp(120px, ${Number(theme.promotion_mobile_height || 160)}px, ${Number(theme.promotion_desktop_height || 220)}px)`}}/><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 text-white">{item.title && <div className="text-sm font-semibold">{item.title}</div>}{item.subtitle && <div className="mt-1 text-xs text-white/80">{item.subtitle}</div>}</div></div>;
  return <section className="relative" aria-label="Promotional messages">{item.link_url?<a href={item.link_url} target="_blank" rel="noreferrer">{card}</a>:card}{theme.promotion_show_arrows !== false && items.length>1 && <><button type="button" onClick={previous} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white"><ChevronLeft className="h-4 w-4"/></button><button type="button" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white"><ChevronRight className="h-4 w-4"/></button></>}{theme.promotion_show_indicators !== false && items.length>1 && <div className="mt-2 flex justify-center gap-1.5">{items.map((_,i)=><button key={i} type="button" onClick={()=>setIndex(i)} className={`h-1.5 rounded-full ${i===index?"w-5 bg-brand":"w-1.5 bg-muted-foreground/40"}`} aria-label={`Promotion ${i+1}`}/>)}</div>}</section>;
}

function MessageBubble({ message, onRetry, onPrompt, onPreview, onHandoff, onMediaLoad }: { message: Message; onRetry: () => void; onPrompt: (text:string) => void; onPreview:(src:string,alt:string)=>void; onHandoff:(reason?:string)=>void; onMediaLoad:()=>void }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex msg-in ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser ? "bg-bubble-user text-bubble-user-foreground rounded-br-sm" : "bg-bubble-ai text-bubble-ai-foreground rounded-bl-sm border border-border"}`}
      >
        {message.blocks && message.blocks.length > 0 ? (
          <StructuredResponse blocks={message.blocks} onPrompt={onPrompt} onPreview={onPreview} onHandoff={onHandoff} onMediaLoad={onMediaLoad} />
        ) : (
          <div>{message.content}</div>
        )}
        {message.images && message.images.length > 0 && (
          <div className="mt-3 grid gap-2">
            {message.images.map((src, index) => (
              <button
                type="button"
                onClick={()=>onPreview(src,"Support visual")}
                key={src + index}
                className="block overflow-hidden rounded-xl border border-border bg-surface-elevated/50"
              >
                <img
                  src={src}
                  alt="Support visual"
                  className="w-full max-h-80 object-contain bg-black/15"
                  loading="lazy"
                  onLoad={onMediaLoad}
                />
              </button>
            ))}
          </div>
        )}
        {message.attachmentUrl && (
          <div className="mt-3">
            {String(message.attachmentContentType || "").startsWith("image/") ? (
              <button type="button" onClick={()=>onPreview(message.attachmentUrl || "",message.attachmentName || "Attachment")} className="block overflow-hidden rounded-xl border border-border"><img src={message.attachmentUrl} alt={message.attachmentName || "Attachment"} className="max-h-80 w-full object-contain" onLoad={onMediaLoad}/></button>
            ) : (
              <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 p-3"><FileText className="h-5 w-5"/><span className="min-w-0 flex-1 truncate text-xs font-semibold">{message.attachmentName || "Download file"}</span><ExternalLink className="h-3.5 w-3.5"/></a>
            )}
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
function StructuredResponse({ blocks, onPrompt, onPreview, onHandoff, onMediaLoad }: { blocks: ResponseBlock[]; onPrompt:(text:string)=>void; onPreview:(src:string,alt:string)=>void; onHandoff:(reason?:string)=>void; onMediaLoad:()=>void }) {
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
        if (block.type === "warning" || block.type === "notice" || block.type === "success" || block.type === "error") {
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
          return <figure key={key} className="overflow-hidden rounded-xl border border-border bg-black/10"><button type="button" className="block w-full cursor-zoom-in" onClick={()=>onPreview(block.url,block.alt || "Support visual")}><img src={block.url} alt={block.alt || "Support visual"} className="w-full max-h-96 object-contain" loading="lazy" onLoad={onMediaLoad} /></button>{block.caption && <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{block.caption}</figcaption>}</figure>;
        }
        if (block.type === "link" || block.type === "button") {
          const isPrompt = block.action_type === "chat_prompt" || block.url.startsWith("prompt:");
          const isHandoff = block.action_type === "human_handoff" || block.url === "support:handoff";
          if (isHandoff) return <button key={key} type="button" onClick={()=>onHandoff("CUSTOMER_REQUESTED_HUMAN")} className="flex w-full items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-left text-xs font-semibold text-white transition-colors hover:bg-emerald-500"><span className="flex-1"><span className="block">{block.label}</span>{block.subtitle && <span className="mt-0.5 block font-normal opacity-80">{block.subtitle}</span>}</span></button>;
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
