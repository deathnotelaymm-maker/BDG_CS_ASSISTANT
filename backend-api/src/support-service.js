import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { bearerToken, createSupportToken, readSupportToken } from './support-auth.js';
import { emitSupportEvent, onSupportEvent } from './support-events.js';

export const SUPPORT_PERMISSIONS = [
  'support.conversations.view_own',
  'support.conversations.view_team',
  'support.conversations.accept',
  'support.conversations.reply',
  'support.conversations.transfer',
  'support.conversations.resolve',
  'support.notes.create',
  'support.reports.view_own',
  'support.reports.view_team',
  'support.staff.manage',
  'support.settings.manage',
  'support.assignments.override',
  'support.force_logout',
  'support.audit.view',
  'support.attachments.send',
  'support.attachments.download',
  'support.quick_replies.view',
  'support.quick_replies.create_personal',
  'support.quick_replies.manage_platform',
  'support.conversations.view_customer_device',
  'support.conversations.view_customer_ip',
  'support.tags.manage',
  'support.admin.join_conversation',
  'support.admin.force_transfer',
  'support.admin.force_close',
];

const DEFAULT_AGENT_PERMISSIONS = new Set([
  'support.conversations.view_own',
  'support.conversations.view_team',
  'support.conversations.accept',
  'support.conversations.reply',
  'support.conversations.transfer',
  'support.conversations.resolve',
  'support.notes.create',
  'support.reports.view_own',
  'support.attachments.send',
  'support.attachments.download',
  'support.quick_replies.view',
  'support.quick_replies.create_personal',
  'support.conversations.view_customer_device',
]);

const CONVERSATION_STATES = new Set([
  'AI_ACTIVE','HANDOFF_OFFERED','WAITING_FOR_AGENT','ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED','RESOLVED','CLOSED',
]);
const HANDOFF_RESULTS = new Set(['ANSWERED','NEEDS_CLARIFICATION','HUMAN_RECOMMENDED','BLOCKED','PROVIDER_ERROR']);
const HANDOFF_REASONS = new Set([
  'CUSTOMER_REQUESTED_HUMAN','REQUEST_NOT_UNDERSTOOD','CLARIFICATION_LIMIT_REACHED','ACCOUNT_INVESTIGATION_REQUIRED',
  'MANUAL_ACTION_REQUIRED','OUTSIDE_ASSISTANT_SCOPE','PROVIDER_FAILURE','ADMIN_KEYWORD',
]);

function cleanText(value, max = 6000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}
function cleanEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 255);
}
function safeIdentityUrl(value, allowEmpty = true) {
  const raw=cleanText(value,2000);
  if (!raw && allowEmpty) return '';
  if (/^\/uploads\//i.test(raw)) return raw;
  try { const parsed=new URL(raw); if (parsed.protocol !== 'https:') throw new Error('https'); return parsed.toString(); }
  catch { throw supportError('Support avatar must use HTTPS or an uploaded media URL',400,'SUPPORT_AVATAR_URL_INVALID'); }
}
function numericId(value, label = 'ID') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw supportError(`${label} is invalid`, 400, 'SUPPORT_ID_INVALID');
  return id;
}
function supportError(message, status = 400, code = 'SUPPORT_BAD_REQUEST') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
function bool(value, fallback = false) {
  return value === undefined || value === null ? fallback : value === true || String(value).toLowerCase() === 'true';
}
function countSentences(text) {
  const value = cleanText(text, 12000);
  if (!value) return 0;
  const parts = value.split(/(?<=[.!?။！？])\s+|\n+/u).map((part) => part.trim()).filter(Boolean);
  return Math.min(200, Math.max(1, parts.length));
}
function safeTimezone(value, fallback = 'UTC') {
  const candidate = cleanText(value, 80) || fallback;
  try { new Intl.DateTimeFormat('en-US', { timeZone:candidate }).format(new Date()); return candidate; }
  catch { throw supportError('Timezone must be a valid IANA timezone such as Asia/Phnom_Penh', 400, 'SUPPORT_TIMEZONE_INVALID'); }
}
function rowDate(value) { return value ? String(value) : ''; }
function parseJsonObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  try { const parsed=JSON.parse(String(value || '{}')); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback; }
  catch { return fallback; }
}
function sha256(value) { return createHash('sha256').update(String(value || '')).digest('hex'); }
function secureEqualHex(left, right) {
  const a=Buffer.from(String(left || ''),'utf8'), b=Buffer.from(String(right || ''),'utf8');
  return a.length === b.length && timingSafeEqual(a,b);
}
function supportLocale(value = 'en') {
  const locale=String(value || 'en').trim().toLowerCase().replace('_','-');
  return locale.split('-')[0] || 'en';
}
const DEFAULT_CUSTOMER_MESSAGES = {
  en:{ waiting:'Your request is in the customer-service queue.', no_staff:'No representative is currently available. Your request remains in the queue.', resolved:'Your customer-service request has been resolved. You can continue chatting here.', agent_joined:'A customer-service representative joined the conversation.', provider_failure:'The response is taking longer than expected. You can retry or send another message.', reconnecting:'Reconnecting…' },
  my:{ waiting:'သင့်တောင်းဆိုချက်ကို ဖောက်သည်ဝန်ဆောင်မှု စောင့်ဆိုင်းစာရင်းထဲ ထည့်ပြီးပါပြီ။', no_staff:'လက်ရှိ ဝန်ထမ်းမအားသေးပါ။ သင့်တောင်းဆိုချက်ကို စောင့်ဆိုင်းစာရင်းထဲ သိမ်းထားပါတယ်။', resolved:'ဖောက်သည်ဝန်ဆောင်မှုက ဒီတောင်းဆိုချက်ကို ဖြေရှင်းပြီးပါပြီ။ ဒီနေရာမှာ ဆက်ပြီး စကားပြောနိုင်ပါတယ်။', agent_joined:'ဖောက်သည်ဝန်ဆောင်မှု ကိုယ်စားလှယ်တစ်ဦး စကားဝိုင်းထဲ ဝင်လာပါပြီ။', provider_failure:'အဖြေပြန်ပေးရန် နည်းနည်းကြာနေပါတယ်။ ထပ်မေးနိုင်သလို အခြားမေးခွန်းလည်း ပို့နိုင်ပါတယ်။', reconnecting:'ပြန်လည်ချိတ်ဆက်နေသည်…' },
  id:{ waiting:'Permintaan Anda sudah masuk antrean layanan pelanggan.', no_staff:'Belum ada perwakilan yang tersedia. Permintaan Anda tetap berada dalam antrean.', resolved:'Permintaan layanan pelanggan Anda telah diselesaikan. Anda dapat melanjutkan percakapan di sini.', agent_joined:'Perwakilan layanan pelanggan telah bergabung dalam percakapan.', provider_failure:'Jawaban membutuhkan waktu lebih lama dari biasanya. Anda dapat mencoba lagi atau mengirim pesan lain.', reconnecting:'Menyambungkan kembali…' },
  zh:{ waiting:'您的请求已加入客服队列。', no_staff:'目前暂无客服人员在线，您的请求会继续保留在队列中。', resolved:'客服请求已处理完成，您可以继续在这里聊天。', agent_joined:'客服人员已加入对话。', provider_failure:'回复需要更长时间，您可以重试或发送其他消息。', reconnecting:'正在重新连接…' },
  hi:{ waiting:'आपका अनुरोध ग्राहक-सेवा कतार में जोड़ दिया गया है।', no_staff:'अभी कोई प्रतिनिधि उपलब्ध नहीं है। आपका अनुरोध कतार में सुरक्षित है।', resolved:'आपका ग्राहक-सेवा अनुरोध हल हो गया है। आप यहाँ बातचीत जारी रख सकते हैं।', agent_joined:'एक ग्राहक-सेवा प्रतिनिधि बातचीत में जुड़ गया है।', provider_failure:'उत्तर में सामान्य से अधिक समय लग रहा है। आप पुनः प्रयास कर सकते हैं या दूसरा संदेश भेज सकते हैं।', reconnecting:'फिर से कनेक्ट हो रहा है…' },
};
function customerMessage(settings, locale, key, fallback = '') {
  const code=supportLocale(locale), configured=parseJsonObject(settings?.customer_messages_json || {}, {});
  return cleanText(configured?.[code]?.[key] || configured?.en?.[key] || DEFAULT_CUSTOMER_MESSAGES[code]?.[key] || DEFAULT_CUSTOMER_MESSAGES.en[key] || fallback, 3000);
}
function createResumeKey() { return randomBytes(32).toString('base64url'); }

function encodeSseEvent(eventName, payload, id = '') {
  const lines=[];
  if (id) lines.push(`id: ${String(id).replace(/[\r\n]/g,'')}`);
  lines.push(`event: ${String(eventName || 'message').replace(/[\r\n]/g,'')}`);
  const data=JSON.stringify(payload ?? {});
  for (const line of data.split(/\r?\n/)) lines.push(`data: ${line}`);
  return `${lines.join('\n')}\n\n`;
}
function streamEventName(event = '') {
  const mapping={
    'support:message_created':'message.created',
    'ai:message_created':'response.completed',
    'ai:job_queued':'response.queued',
    'ai:processing_started':'response.processing',
    'ai:processing_updated':'response.processing',
    'ai:processing_failed':'response.failed',
    'ai:processing_cancelled':'response.cancelled',
    'support:conversation_assigned':'conversation.assigned',
    'support:conversation_resolved':'conversation.resolved',
    'support:message_state':'message.state',
    'support:typing':'conversation.typing',
    'support:force_logout':'session.revoked',
  };
  return mapping[event] || 'conversation.updated';
}
async function customerSupportStreamResponse(request, env, url, publicId, deps) {
  const customer=await getCustomerByToken(env,bearerToken(request),deps);
  if (String(customer.conversation.public_id)!==String(publicId)) throw supportError('Conversation token does not match this conversation',403,'SUPPORT_CUSTOMER_SCOPE_MISMATCH');
  const after=Math.max(0,Number(url.searchParams.get('after_sequence') || request.headers.get('last-event-id') || 0));
  const rows=(await deps.q(env,`SELECT sm.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS sender_name,sp.public_avatar_url AS sender_avatar_url FROM support_messages sm LEFT JOIN support_staff_profiles sp ON sp.id=sm.sender_staff_id WHERE sm.conversation_id=$1 AND sm.message_sequence>$2 AND sm.is_internal=FALSE ORDER BY sm.message_sequence ASC LIMIT 500`,[customer.conversation.id,after])).rows.map(messageOut);
  const conversation=(await deps.q(env,`SELECT c.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS assigned_staff_name FROM support_conversations c LEFT JOIN support_staff_profiles sp ON sp.id=c.assigned_staff_id WHERE c.id=$1`,[customer.conversation.id])).rows[0];
  const jobs=(await deps.q(env,`SELECT id,public_id,status,attempt_count,created_at,started_at FROM ai_jobs WHERE conversation_id=$1 AND status IN ('QUEUED','PROCESSING','RETRYING') ORDER BY id LIMIT 20`,[customer.conversation.id])).rows.map((job)=>({ ...job,id:Number(job.id),attempt_count:Number(job.attempt_count || 0) }));
  const settings=supportSettingsOut(await ensureSettings(deps.q,env,customer.conversation));
  if (settings.customer_stream_enabled === false) throw supportError('Customer stream is disabled',409,'SUPPORT_STREAM_DISABLED');
  const heartbeatMs=settings.customer_stream_heartbeat_seconds*1000;
  const encoder=new TextEncoder();
  let cleanup=()=>{};
  const stream=new ReadableStream({
    start(controller) {
      let closed=false;
      const push=(name,payload,id='')=>{ if (!closed) { try { controller.enqueue(encoder.encode(encodeSseEvent(name,payload,id))); } catch {} } };
      push('session',{ conversation:conversationOut(conversation),messages:rows,active_ai_jobs:jobs,after_sequence:after,transport:'sse' },String(rows.at(-1)?.message_sequence || after || ''));
      const unsubscribe=onSupportEvent((event)=>{
        if (Number(event.platform_id || 0)!==Number(customer.conversation.platform_id)) return;
        if (Number(event.conversation_id || event.data?.conversation_id || 0)!==Number(customer.conversation.id)) return;
        const message=event.data?.message;
        const eventId=message?.message_sequence || event.id;
        push(streamEventName(event.event),{ ...event.data,event_id:event.id,conversation_id:Number(customer.conversation.id),created_at:event.created_at,source_event:event.event },eventId);
      });
      const heartbeat=setInterval(()=>push('heartbeat',{ server_time:new Date().toISOString() }),heartbeatMs);
      const close=()=>{ if (closed) return; closed=true; clearInterval(heartbeat); unsubscribe(); try { controller.close(); } catch {} };
      cleanup=close;
      request.signal?.addEventListener('abort',close,{ once:true });
    },
    cancel(){ cleanup(); },
  });
  return new Response(stream,{ status:200,headers:{ 'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff' } });
}


async function adminSupportStreamResponse(request,env,url,conversationId,scope,deps) {
  const after=Math.max(0,Number(url.searchParams.get('after_sequence') || request.headers.get('last-event-id') || 0));
  const rows=(await deps.q(env,`SELECT sm.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS sender_name,sp.public_avatar_url AS sender_avatar_url FROM support_messages sm LEFT JOIN support_staff_profiles sp ON sp.id=sm.sender_staff_id WHERE sm.conversation_id=$1 AND sm.message_sequence>$2 ORDER BY sm.message_sequence ASC LIMIT 500`,[conversationId,after])).rows.map(messageOut);
  const conversation=(await deps.q(env,`SELECT c.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS assigned_staff_name FROM support_conversations c LEFT JOIN support_staff_profiles sp ON sp.id=c.assigned_staff_id WHERE c.id=$1 AND c.tenant_id=$2 AND c.platform_id=$3`,[conversationId,scope.tenant_id,scope.platform_id])).rows[0];
  if (!conversation) throw supportError('Conversation not found',404,'SUPPORT_CONVERSATION_NOT_FOUND');
  const settings=supportSettingsOut(await ensureSettings(deps.q,env,scope)); const heartbeatMs=settings.customer_stream_heartbeat_seconds*1000;
  const encoder=new TextEncoder(); let cleanup=()=>{};
  const stream=new ReadableStream({start(controller){let closed=false;const push=(name,payload,id='')=>{if(!closed){try{controller.enqueue(encoder.encode(encodeSseEvent(name,payload,id)))}catch{}}};push('session',{conversation:conversationOut(conversation),messages:rows,after_sequence:after,transport:'sse-admin'},String(rows.at(-1)?.message_sequence||after||''));const unsubscribe=onSupportEvent((event)=>{if(Number(event.platform_id||0)!==Number(scope.platform_id))return;const conversationMatch=Number(event.conversation_id||event.data?.conversation_id||0)===Number(conversationId);if(!conversationMatch)return;const message=event.data?.message;push(streamEventName(event.event),{...event.data,event_id:event.id,conversation_id:Number(conversationId),created_at:event.created_at,source_event:event.event},message?.message_sequence||event.id);});const heartbeat=setInterval(()=>push('heartbeat',{server_time:new Date().toISOString()}),heartbeatMs);const close=()=>{if(closed)return;closed=true;clearInterval(heartbeat);unsubscribe();try{controller.close()}catch{}};cleanup=close;request.signal?.addEventListener('abort',close,{once:true});},cancel(){cleanup();}});
  return new Response(stream,{status:200,headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'}});
}

async function staffSupportStreamResponse(request, env, url, conversationId, staff, deps) {
  const scope={ tenant_id:staff.tenant_id,platform_id:staff.platform_id };
  if (!await supportRealtimeCanSubscribe(env,{ kind:'staff',staff,tenant_id:scope.tenant_id,platform_id:scope.platform_id,staff_id:staff.id },conversationId,deps)) throw supportError('Conversation access denied',403,'SUPPORT_SUBSCRIBE_DENIED');
  const after=Math.max(0,Number(url.searchParams.get('after_sequence') || request.headers.get('last-event-id') || 0));
  const rows=(await deps.q(env,`SELECT sm.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS sender_name,sp.public_avatar_url AS sender_avatar_url FROM support_messages sm LEFT JOIN support_staff_profiles sp ON sp.id=sm.sender_staff_id WHERE sm.conversation_id=$1 AND sm.message_sequence>$2 ORDER BY sm.message_sequence ASC LIMIT 500`,[conversationId,after])).rows.map(messageOut);
  const conversation=(await deps.q(env,`SELECT c.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS assigned_staff_name FROM support_conversations c LEFT JOIN support_staff_profiles sp ON sp.id=c.assigned_staff_id WHERE c.id=$1 AND c.tenant_id=$2 AND c.platform_id=$3`,[conversationId,scope.tenant_id,scope.platform_id])).rows[0];
  const settings=supportSettingsOut(await ensureSettings(deps.q,env,scope));
  const heartbeatMs=settings.customer_stream_heartbeat_seconds*1000;
  const encoder=new TextEncoder();
  let cleanup=()=>{};
  const stream=new ReadableStream({
    start(controller) {
      let closed=false;
      const push=(name,payload,id='')=>{ if (!closed) { try { controller.enqueue(encoder.encode(encodeSseEvent(name,payload,id))); } catch {} } };
      push('session',{ conversation:conversationOut(conversation),messages:rows,after_sequence:after,transport:'sse' },String(rows.at(-1)?.message_sequence || after || ''));
      const unsubscribe=onSupportEvent((event)=>{
        if (Number(event.platform_id || 0)!==Number(scope.platform_id)) return;
        const conversationMatch=Number(event.conversation_id || event.data?.conversation_id || 0)===Number(conversationId);
        const staffMatch=Number(event.staff_id || event.data?.staff_id || 0)===Number(staff.id);
        if (!conversationMatch && !staffMatch) return;
        const message=event.data?.message;
        const eventId=message?.message_sequence || event.id;
        push(streamEventName(event.event),{ ...event.data,event_id:event.id,conversation_id:Number(conversationId),created_at:event.created_at,source_event:event.event },eventId);
      });
      const heartbeat=setInterval(()=>push('heartbeat',{ server_time:new Date().toISOString() }),heartbeatMs);
      const close=()=>{ if (closed) return; closed=true; clearInterval(heartbeat); unsubscribe(); try { controller.close(); } catch {} };
      cleanup=close;
      request.signal?.addEventListener('abort',close,{ once:true });
    },
    cancel(){ cleanup(); },
  });
  return new Response(stream,{ status:200,headers:{ 'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff' } });
}

function supportSettingsOut(row = {}) {
  return {
    id:Number(row.id || 0), tenant_id:Number(row.tenant_id || 0), platform_id:Number(row.platform_id || 0),
    human_support_enabled:row.human_support_enabled === true,
    handoff_button_text:row.handoff_button_text || 'Contact Customer Service',
    ai_suggestion_message:row.ai_suggestion_message || '', waiting_message:row.waiting_message || '',
    no_staff_online_message:row.no_staff_online_message || '', fallback_message:row.fallback_message || '',
    maximum_clarification_attempts:Number(row.maximum_clarification_attempts ?? 2),
    trigger_customer_request:row.trigger_customer_request !== false,
    trigger_not_understood:row.trigger_not_understood !== false,
    trigger_outside_scope:row.trigger_outside_scope !== false,
    trigger_account_investigation:row.trigger_account_investigation !== false,
    trigger_manual_action:row.trigger_manual_action !== false,
    trigger_provider_error:row.trigger_provider_error !== false,
    trigger_clarification_limit:row.trigger_clarification_limit !== false,
    escalation_keywords:row.escalation_keywords || '', platform_timezone:row.platform_timezone || 'UTC',
    allow_staff_timezone_override:row.allow_staff_timezone_override === true,
    heartbeat_interval_seconds:Number(row.heartbeat_interval_seconds || 30),
    offline_timeout_seconds:Number(row.offline_timeout_seconds || 90), idle_timeout_seconds:Number(row.idle_timeout_seconds || 300),
    force_logout_assignment_policy:row.force_logout_assignment_policy || 'return_to_queue',
    attachments_enabled:row.attachments_enabled === true,
    customer_attachments_enabled:row.customer_attachments_enabled !== false,
    staff_attachments_enabled:row.staff_attachments_enabled !== false,
    attachment_max_bytes:Math.max(1048576,Math.min(26214400,Number(row.attachment_max_bytes || 10485760))),
    attachment_allowed_types_json:Array.isArray(row.attachment_allowed_types_json) ? row.attachment_allowed_types_json : (()=>{try{return JSON.parse(row.attachment_allowed_types_json || '[]')}catch{return []}})(),
    processing_message_enabled:row.processing_message_enabled !== false,
    processing_message_text:row.processing_message_text || 'I’m preparing your answer. Please give me a moment…',
    processing_message_secondary_text:row.processing_message_secondary_text || 'I’m still working on your answer…',
    processing_message_delay_ms:Number(row.processing_message_delay_ms || 700),
    processing_message_secondary_delay_ms:Number(row.processing_message_secondary_delay_ms || 8000),
    processing_message_max_visible_ms:Number(row.processing_message_max_visible_ms || 45000),
    allow_messages_while_ai_processing:false,
    provider_failure_message:row.provider_failure_message || 'The response is taking longer than expected. You can retry or send another message.',
    return_to_ai_on_resolve:row.return_to_ai_on_resolve !== false,
    customer_messages_json:parseJsonObject(row.customer_messages_json, {}),
    realtime_poll_interval_ms:Math.min(15000,Math.max(1500,Number(row.realtime_poll_interval_ms || 2500))),
    customer_stream_enabled:row.customer_stream_enabled !== false,
    customer_stream_heartbeat_seconds:Math.min(45,Math.max(10,Number(row.customer_stream_heartbeat_seconds || 15))),
    automated_support_display_name:row.automated_support_display_name || 'Support',
    automated_support_avatar_url:row.automated_support_avatar_url || '',
    admin_support_display_name:row.admin_support_display_name || 'Support Team',
    admin_support_avatar_url:row.admin_support_avatar_url || '',
    show_staff_public_name:row.show_staff_public_name !== false,
    show_staff_avatar:row.show_staff_avatar !== false,
    chat_menu_enabled:row.chat_menu_enabled !== false,
    sticky_support_header_enabled:row.sticky_support_header_enabled !== false,
    updated_at:rowDate(row.updated_at),
  };
}
function staffOut(row = {}, permissions = []) {
  return {
    id:Number(row.id || row.staff_id || 0), admin_user_id:Number(row.admin_user_id || 0),
    tenant_id:Number(row.tenant_id || 0), platform_id:Number(row.platform_id || 0),
    display_name:row.display_name || row.name || '', public_display_name:row.public_display_name || row.display_name || row.name || '', public_avatar_url:row.public_avatar_url || '', actor_type:row.actor_type || 'STAFF', email:row.email || '', role_key:row.role_key || 'support_agent',
    account_status:row.account_status || (row.is_active === false ? 'inactive' : 'active'),
    availability_status:row.availability_status || 'offline', timezone:row.timezone || '',
    use_platform_timezone:row.use_platform_timezone !== false, personal_timezone_allowed:row.personal_timezone_allowed === true,
    must_change_password:row.must_change_password === true, max_active_conversations:Number(row.max_active_conversations || 5),
    last_seen_at:rowDate(row.last_seen_at), last_login_at:rowDate(row.last_login_at),
    created_at:rowDate(row.created_at), updated_at:rowDate(row.updated_at), permissions,
  };
}
function messageOut(row = {}) {
  return {
    id:Number(row.id || 0), public_id:String(row.public_id || ''), conversation_id:Number(row.conversation_id || 0),
    client_message_id:row.client_message_id || '', ai_job_id:row.ai_job_id ? Number(row.ai_job_id) : null,
    sender_type:row.sender_type || 'SYSTEM', sender_staff_id:row.sender_staff_id ? Number(row.sender_staff_id) : null,
    sender_name:row.sender_name || row.display_name || parseJsonObject(row.metadata_json,{}).sender_name || '', sender_avatar_url:row.sender_avatar_url || parseJsonObject(row.metadata_json,{}).sender_avatar_url || '', message_type:row.message_type || 'text',
    body_text:row.body_text || '', attachment_url:row.attachment_url || '', attachment_name:row.attachment_name || '',
    attachment_content_type:row.attachment_content_type || '', attachment_size_bytes:Number(row.attachment_size_bytes || 0),
    is_internal:row.is_internal === true, sentence_count:Number(row.sentence_count || 0),
    message_sequence:Number(row.message_sequence || 0), delivered_at:rowDate(row.delivered_at), read_at:rowDate(row.read_at),
    metadata:typeof row.metadata_json === 'object' && row.metadata_json ? row.metadata_json : (()=>{try{return JSON.parse(row.metadata_json || '{}')}catch{return {}}})(),
    created_at:rowDate(row.created_at),
  };
}
function conversationOut(row = {}) {
  return {
    id:Number(row.id || 0), public_id:String(row.public_id || ''), tenant_id:Number(row.tenant_id || 0), platform_id:Number(row.platform_id || 0),
    chat_session_id:row.chat_session_id || '', customer_identifier:row.customer_identifier || '', customer_display_name:row.customer_display_name || '',
    customer_locale:row.customer_locale || '', status:row.status || 'AI_ACTIVE', control_mode:row.control_mode || 'AI', priority:row.priority || 'normal',
    handoff_reason:row.handoff_reason || '', handoff_detail:row.handoff_detail || '', clarification_attempts:Number(row.clarification_attempts || 0),
    assigned_staff_id:row.assigned_staff_id ? Number(row.assigned_staff_id) : null,
    assigned_staff_name:row.assigned_staff_name || '', queue_entered_at:rowDate(row.queue_entered_at),
    first_assigned_at:rowDate(row.first_assigned_at), first_agent_reply_at:rowDate(row.first_agent_reply_at),
    resolved_at:rowDate(row.resolved_at), closed_at:rowDate(row.closed_at), last_message_at:rowDate(row.last_message_at),
    created_at:rowDate(row.created_at), updated_at:rowDate(row.updated_at), unread_count:Number(row.unread_count || 0),
    last_message:row.last_message || '', waiting_seconds:Number(row.waiting_seconds || 0), version:Number(row.version || 1),
    last_message_sequence:Number(row.last_message_sequence || 0), return_to_ai_on_resolve:row.return_to_ai_on_resolve !== false,
    last_customer_read_sequence:Number(row.last_customer_read_sequence || 0), last_staff_read_sequence:Number(row.last_staff_read_sequence || 0),
    pinned_at:rowDate(row.pinned_at), pinned_by:row.pinned_by || '',
    tags:Array.isArray(row.tags_json) ? row.tags_json : (()=>{try{return JSON.parse(row.tags_json || '[]')}catch{return []}})(),
    customer_context:row.customer_context || null,
  };
}


async function appendSupportMessageWithQuery(tq, scope, conversationId, data = {}) {
  const clientId=cleanText(data.client_message_id,120) || null;
  if (clientId) {
    const duplicate=(await tq(`SELECT * FROM support_messages WHERE conversation_id=$1 AND client_message_id=$2 LIMIT 1`,[conversationId,clientId])).rows[0];
    if (duplicate) return duplicate;
  }
  const sequence=Number((await tq(`UPDATE support_conversations SET last_message_sequence=last_message_sequence+1,last_message_at=NOW(),updated_at=NOW(),version=version+1 WHERE id=$1 RETURNING last_message_sequence`,[conversationId])).rows[0]?.last_message_sequence || 0);
  return (await tq(`INSERT INTO support_messages(tenant_id,platform_id,conversation_id,sender_type,sender_staff_id,client_message_id,message_type,body_text,body_html,attachment_url,attachment_name,attachment_content_type,attachment_size_bytes,is_internal,sentence_count,message_sequence,delivered_at,metadata_json,created_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,COALESCE($19::timestamptz,NOW())) RETURNING *`,[
    scope.tenant_id,scope.platform_id,conversationId,data.sender_type || 'SYSTEM',data.sender_staff_id || null,clientId,data.message_type || 'text',cleanText(data.body_text,12000),String(data.body_html || ''),data.attachment_url || null,data.attachment_name || null,data.attachment_content_type || null,data.attachment_size_bytes || null,data.is_internal === true,Number(data.sentence_count ?? countSentences(data.body_text)),sequence,data.delivered_at === null ? null : (data.delivered_at || new Date().toISOString()),JSON.stringify(data.metadata || {}),data.created_at || null,
  ])).rows[0];
}
async function appendSupportMessage(deps, env, scope, conversationId, data = {}) {
  return deps.withTransaction(env,(tq)=>appendSupportMessageWithQuery(tq,scope,conversationId,data));
}
async function appendSupportMessageDirect(q, env, scope, conversationId, data = {}) {
  const sequence=Number((await q(env,`UPDATE support_conversations SET last_message_sequence=last_message_sequence+1,last_message_at=NOW(),updated_at=NOW(),version=version+1 WHERE id=$1 RETURNING last_message_sequence`,[conversationId])).rows[0]?.last_message_sequence || 0);
  return (await q(env,`INSERT INTO support_messages(tenant_id,platform_id,conversation_id,sender_type,sender_staff_id,client_message_id,message_type,body_text,is_internal,sentence_count,message_sequence,delivered_at,metadata_json,created_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,COALESCE($14::timestamptz,NOW())) ON CONFLICT(conversation_id,client_message_id) DO UPDATE SET client_message_id=EXCLUDED.client_message_id RETURNING *`,[scope.tenant_id,scope.platform_id,conversationId,data.sender_type || 'SYSTEM',data.sender_staff_id || null,cleanText(data.client_message_id,120) || null,data.message_type || 'text',cleanText(data.body_text,12000),data.is_internal === true,Number(data.sentence_count ?? countSentences(data.body_text)),sequence,data.delivered_at === null ? null : (data.delivered_at || new Date().toISOString()),JSON.stringify(data.metadata || {}),data.created_at || null])).rows[0];
}

async function ensureSettings(q, env, scope) {
  const existing = (await q(env, 'SELECT * FROM support_settings WHERE tenant_id=$1 AND platform_id=$2 LIMIT 1', [scope.tenant_id, scope.platform_id])).rows[0];
  if (existing) return existing;
  return (await q(env, `INSERT INTO support_settings(tenant_id,platform_id) VALUES($1,$2) ON CONFLICT(platform_id) DO UPDATE SET platform_id=EXCLUDED.platform_id RETURNING *`, [scope.tenant_id,scope.platform_id])).rows[0];
}
async function staffPermissions(q, env, staffId) {
  const rows = (await q(env, 'SELECT permission_key,allowed FROM support_staff_permissions WHERE staff_id=$1', [staffId])).rows;
  if (!rows.length) return [...DEFAULT_AGENT_PERMISSIONS];
  return rows.filter((row) => row.allowed !== false).map((row) => row.permission_key);
}
function requirePermission(staff, permission) {
  if (!staff?.permissions?.includes(permission)) throw supportError('Support permission denied', 403, 'SUPPORT_PERMISSION_DENIED');
}
async function supportAudit(q, env, scope, actorType, actorId, action, entityType, entityId, details = '', metadata = {}) {
  try {
    await q(env, `INSERT INTO support_audit_events(tenant_id,platform_id,actor_type,actor_id,action,entity_type,entity_id,details,metadata_json)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`, [scope.tenant_id,scope.platform_id,actorType,String(actorId || ''),action,entityType,String(entityId || ''),cleanText(details,3000),JSON.stringify(metadata || {})]);
  } catch (_) {}
}
async function getStaffByToken(env, token, deps) {
  const claims = readSupportToken(env, token, 'staff');
  const row = (await deps.q(env, `SELECT sp.*,au.email,au.name,au.is_active,au.session_version
    FROM support_staff_profiles sp JOIN admin_users au ON au.id=sp.admin_user_id
    WHERE sp.id=$1 AND sp.tenant_id=$2 AND sp.platform_id=$3 AND sp.archived_at IS NULL LIMIT 1`,
    [claims.staff_id,claims.tenant_id,claims.platform_id])).rows[0];
  if (!row || row.is_active === false || row.account_status !== 'active') throw supportError('Staff account is inactive', 401, 'SUPPORT_ACCOUNT_INACTIVE');
  if (Number(row.session_version || 0) !== Number(claims.sv || 0)) throw supportError('Staff session has been revoked', 401, 'SUPPORT_SESSION_REVOKED');
  const permissions = await staffPermissions(deps.q, env, row.id);
  return { ...staffOut(row, permissions), session_id:Number(claims.session_id || 0), token_claims:claims };
}
async function getCustomerByToken(env, token, deps) {
  const claims = readSupportToken(env, token, 'customer');
  const row = (await deps.q(env, `SELECT * FROM support_conversations WHERE id=$1 AND platform_id=$2 AND public_id::text=$3 LIMIT 1`, [claims.conversation_id,claims.platform_id,claims.conversation_public_id])).rows[0];
  if (!row || row.chat_session_id !== claims.chat_session_id) throw supportError('Customer support session is invalid', 401, 'SUPPORT_CUSTOMER_SESSION_INVALID');
  return { claims, conversation:conversationOut(row) };
}

async function issueRealtimeTicket(env, access, deps) {
  const raw=`rt_${randomBytes(32).toString('base64url')}`;
  const expiresAt=new Date(Date.now()+60_000).toISOString();
  const payload=access.kind === 'staff'
    ? { kind:'staff',tenant_id:access.tenant_id,platform_id:access.platform_id,staff_id:access.staff_id,staff:access.staff }
    : { kind:'customer',tenant_id:access.tenant_id,platform_id:access.platform_id,conversation_id:access.conversation_id,conversation:access.conversation };
  await deps.q(env,`DELETE FROM support_realtime_tickets WHERE expires_at<NOW()-INTERVAL '5 minutes' OR consumed_at<NOW()-INTERVAL '5 minutes'`);
  await deps.q(env,`INSERT INTO support_realtime_tickets(token_hash,identity_kind,tenant_id,platform_id,conversation_id,staff_id,access_json,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::timestamptz)`,[sha256(raw),access.kind,access.tenant_id,access.platform_id,access.conversation_id || null,access.staff_id || null,JSON.stringify(payload),expiresAt]);
  return { ticket:raw,expires_at:expiresAt };
}
async function consumeRealtimeTicket(env, ticket, deps) {
  const hash=sha256(ticket);
  const row=(await deps.q(env,`UPDATE support_realtime_tickets SET consumed_at=NOW() WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at>NOW() RETURNING *`,[hash])).rows[0];
  if (!row) throw supportError('Realtime ticket is invalid or expired',401,'SUPPORT_REALTIME_TICKET_INVALID');
  const payload=parseJsonObject(row.access_json,{});
  if (row.identity_kind === 'staff') {
    const staffRow=(await deps.q(env,`SELECT sp.*,au.email,au.name,au.is_active,au.session_version FROM support_staff_profiles sp JOIN admin_users au ON au.id=sp.admin_user_id WHERE sp.id=$1 AND sp.tenant_id=$2 AND sp.platform_id=$3 AND sp.archived_at IS NULL LIMIT 1`,[row.staff_id,row.tenant_id,row.platform_id])).rows[0];
    if (!staffRow || staffRow.is_active === false || staffRow.account_status !== 'active') throw supportError('Staff account is inactive',401,'SUPPORT_ACCOUNT_INACTIVE');
    const ticketSessionVersion=Number(payload?.staff?.token_claims?.sv ?? payload?.staff?.session_version ?? -1);
    if (ticketSessionVersion < 0 || Number(staffRow.session_version || 0) !== ticketSessionVersion) throw supportError('Staff session has been revoked',401,'SUPPORT_SESSION_REVOKED');
    const sessionId=Number(payload?.staff?.session_id || 0);
    const session=sessionId ? (await deps.q(env,`SELECT id FROM support_staff_sessions WHERE id=$1 AND staff_id=$2 AND revoked_at IS NULL AND signed_out_at IS NULL LIMIT 1`,[sessionId,staffRow.id])).rows[0] : null;
    if (!session) throw supportError('Staff realtime session is unavailable',401,'SUPPORT_SESSION_REVOKED');
    const permissions=await staffPermissions(deps.q,env,staffRow.id);
    const staff={ ...staffOut(staffRow,permissions),session_id:sessionId };
    return { kind:'staff',staff,tenant_id:staff.tenant_id,platform_id:staff.platform_id,staff_id:staff.id };
  }
  const conversation=(await deps.q(env,`SELECT * FROM support_conversations WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 LIMIT 1`,[row.conversation_id,row.tenant_id,row.platform_id])).rows[0];
  if (!conversation) throw supportError('Customer conversation is unavailable',401,'SUPPORT_CUSTOMER_SESSION_INVALID');
  return { kind:'customer',conversation:conversationOut(conversation),tenant_id:Number(row.tenant_id),platform_id:Number(row.platform_id),conversation_id:Number(row.conversation_id) };
}

export async function verifySupportRealtimeAccess(env, token, deps) {
  if (String(token || '').startsWith('rt_')) return consumeRealtimeTicket(env,token,deps);
  const claims = readSupportToken(env, token);
  if (claims.kind === 'staff') {
    const staff = await getStaffByToken(env, token, deps);
    return { kind:'staff', staff, tenant_id:staff.tenant_id, platform_id:staff.platform_id, staff_id:staff.id };
  }
  if (claims.kind === 'customer') {
    const customer = await getCustomerByToken(env, token, deps);
    return { kind:'customer', ...customer, tenant_id:customer.conversation.tenant_id, platform_id:customer.conversation.platform_id, conversation_id:customer.conversation.id };
  }
  throw supportError('Unsupported realtime identity', 401, 'SUPPORT_REALTIME_IDENTITY_INVALID');
}

export async function supportRealtimePresence(env, access, state, deps) {
  if (access.kind !== 'staff') return;
  const normalized = ['active','invisible'].includes(String(state || '').toLowerCase()) ? String(state).toLowerCase() : access.staff.availability_status;
  await updatePresence(deps.q, env, access.staff, normalized, access.staff.session_id);
}
export async function supportRealtimeHeartbeat(env, access, deps) {
  if (access.kind !== 'staff') return;
  await deps.q(env, `UPDATE support_staff_profiles SET last_seen_at=NOW(),updated_at=NOW() WHERE id=$1`, [access.staff.id]);
  await deps.q(env, `UPDATE support_staff_sessions SET last_seen_at=NOW() WHERE id=$1 AND staff_id=$2 AND revoked_at IS NULL`, [access.staff.session_id,access.staff.id]);
  await deps.q(env, `UPDATE support_presence_sessions SET last_heartbeat_at=NOW() WHERE staff_id=$1 AND ended_at IS NULL`, [access.staff.id]);
}
export async function supportRealtimeCanSubscribe(env, access, conversationId, deps) {
  const id = numericId(conversationId, 'Conversation ID');
  const row = (await deps.q(env, 'SELECT * FROM support_conversations WHERE id=$1 AND tenant_id=$2 AND platform_id=$3', [id,access.tenant_id,access.platform_id])).rows[0];
  if (!row) return false;
  if (access.kind === 'customer') return Number(access.conversation_id) === id;
  return Number(row.assigned_staff_id || 0) === Number(access.staff_id) || access.staff.permissions.includes('support.conversations.view_team');
}

async function updatePresence(q, env, staff, state, staffSessionId = null) {
  const normalized = ['active','invisible','offline','idle'].includes(state) ? state : 'active';
  await q(env, `UPDATE support_presence_sessions SET ended_at=NOW(),duration_seconds=GREATEST(0,EXTRACT(EPOCH FROM (NOW()-started_at))::int),last_heartbeat_at=NOW()
    WHERE staff_id=$1 AND ended_at IS NULL`, [staff.id]);
  if (normalized !== 'offline') {
    await q(env, `INSERT INTO support_presence_sessions(tenant_id,platform_id,staff_id,staff_session_id,state) VALUES($1,$2,$3,$4,$5)`, [staff.tenant_id,staff.platform_id,staff.id,staffSessionId || null,normalized]);
  }
  await q(env, `UPDATE support_staff_profiles SET availability_status=$1,last_seen_at=NOW(),updated_at=NOW() WHERE id=$2`, [normalized === 'idle' ? 'active' : normalized,staff.id]);
  emitSupportEvent({ event:'support:presence', platform_id:staff.platform_id, staff_id:staff.id, data:{ staff_id:staff.id,status:normalized,last_seen_at:new Date().toISOString() } });
}

async function releaseAssignedConversations(q, env, scope, staffId, reason = 'staff_offline') {
  const settings = supportSettingsOut(await ensureSettings(q, env, scope));
  if (settings.force_logout_assignment_policy === 'keep_assigned') return [];
  if (settings.force_logout_assignment_policy === 'resolve') {
    const resolved = (await q(env, `UPDATE support_conversations SET status='RESOLVED',control_mode=CASE WHEN return_to_ai_on_resolve THEN 'AI' ELSE 'CLOSED' END,assigned_staff_id=NULL,resolved_at=NOW(),updated_at=NOW(),version=version+1
      WHERE assigned_staff_id=$1 AND tenant_id=$2 AND platform_id=$3 AND status IN ('ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED') RETURNING id`, [staffId,scope.tenant_id,scope.platform_id])).rows;
    await q(env, `UPDATE support_assignments SET released_at=NOW(),release_reason=$2 WHERE staff_id=$1 AND released_at IS NULL`, [staffId,reason]);
    return resolved;
  }
  const returned = (await q(env, `UPDATE support_conversations SET assigned_staff_id=NULL,status='WAITING_FOR_AGENT',control_mode='HUMAN',queue_entered_at=NOW(),updated_at=NOW(),version=version+1
    WHERE assigned_staff_id=$1 AND tenant_id=$2 AND platform_id=$3 AND status IN ('ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED') RETURNING id`, [staffId,scope.tenant_id,scope.platform_id])).rows;
  await q(env, `UPDATE support_assignments SET released_at=NOW(),release_reason=$2 WHERE staff_id=$1 AND released_at IS NULL`, [staffId,reason]);
  for (const item of returned) emitSupportEvent({ event:'support:queue_updated',platform_id:scope.platform_id,conversation_id:Number(item.id),data:{ reason } });
  return returned;
}

async function expireStalePresence(q, env, scope) {
  const settings = supportSettingsOut(await ensureSettings(q, env, scope));
  const rows = (await q(env, `UPDATE support_staff_profiles sp SET availability_status='offline',updated_at=NOW()
    WHERE sp.tenant_id=$1 AND sp.platform_id=$2 AND sp.availability_status<>'offline'
      AND (sp.last_seen_at IS NULL OR sp.last_seen_at < NOW() - ($3::int * INTERVAL '1 second')) RETURNING sp.id`,
    [scope.tenant_id,scope.platform_id,settings.offline_timeout_seconds])).rows;
  if (rows.length) {
    await q(env, `UPDATE support_presence_sessions SET ended_at=NOW(),duration_seconds=GREATEST(0,EXTRACT(EPOCH FROM (NOW()-started_at))::int)
      WHERE staff_id=ANY($1::bigint[]) AND ended_at IS NULL`, [rows.map((row) => row.id)]);
    for (const row of rows) await releaseAssignedConversations(q,env,scope,Number(row.id),'heartbeat_timeout');
  }
}

async function listConversationRows(q, env, scope, whereSql = '', params = [], limit = 100) {
  const values = [scope.tenant_id,scope.platform_id,...params,Math.min(250,Math.max(1,Number(limit || 100)))];
  const limitRef = `$${values.length}`;
  const { rows } = await q(env, `SELECT c.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS assigned_staff_name,
      COALESCE((SELECT body_text FROM support_messages sm WHERE sm.conversation_id=c.id AND sm.is_internal=FALSE ORDER BY sm.message_sequence DESC,sm.id DESC LIMIT 1),'') AS last_message,
      GREATEST(0,EXTRACT(EPOCH FROM (NOW()-COALESCE(c.queue_entered_at,c.created_at)))::int) AS waiting_seconds
    FROM support_conversations c LEFT JOIN support_staff_profiles sp ON sp.id=c.assigned_staff_id
    WHERE c.tenant_id=$1 AND c.platform_id=$2 ${whereSql}
    ORDER BY CASE c.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      CASE WHEN c.status='WAITING_FOR_AGENT' THEN c.queue_entered_at ELSE c.last_message_at END DESC NULLS LAST
    LIMIT ${limitRef}`, values);
  return rows.map(conversationOut);
}
async function conversationDetail(q, env, scope, conversationId) {
  const id = numericId(conversationId, 'Conversation ID');
  const row = (await q(env, `SELECT c.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS assigned_staff_name FROM support_conversations c LEFT JOIN support_staff_profiles sp ON sp.id=c.assigned_staff_id WHERE c.id=$1 AND c.tenant_id=$2 AND c.platform_id=$3`, [id,scope.tenant_id,scope.platform_id])).rows[0];
  if (!row) throw supportError('Support conversation not found', 404, 'SUPPORT_CONVERSATION_NOT_FOUND');
  const messages = (await q(env, `SELECT sm.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS sender_name,sp.public_avatar_url AS sender_avatar_url FROM support_messages sm LEFT JOIN support_staff_profiles sp ON sp.id=sm.sender_staff_id WHERE sm.conversation_id=$1 ORDER BY sm.message_sequence ASC,sm.id ASC LIMIT 1000`, [id])).rows.map(messageOut);
  const notes = (await q(env, `SELECT n.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name,n.author_admin_email,'Administrator') AS author_name FROM support_internal_notes n LEFT JOIN support_staff_profiles sp ON sp.id=n.author_staff_id WHERE n.conversation_id=$1 ORDER BY n.id DESC LIMIT 100`, [id])).rows.map((note) => ({ ...note,id:Number(note.id),created_at:rowDate(note.created_at) }));
  const transfers = (await q(env, `SELECT t.*,f.display_name AS from_staff_name,x.display_name AS to_staff_name FROM support_transfers t LEFT JOIN support_staff_profiles f ON f.id=t.from_staff_id LEFT JOIN support_staff_profiles x ON x.id=t.to_staff_id WHERE t.conversation_id=$1 ORDER BY t.id DESC LIMIT 100`, [id])).rows.map((item) => ({ ...item,id:Number(item.id),from_staff_id:item.from_staff_id ? Number(item.from_staff_id) : null,to_staff_id:Number(item.to_staff_id),requested_at:rowDate(item.requested_at),responded_at:rowDate(item.responded_at),completed_at:rowDate(item.completed_at) }));
  return { conversation:conversationOut(row), messages, notes, transfers };
}

async function copyAiHistoryIntoSupport(q, env, scope, conversation) {
  const existing = Number((await q(env, 'SELECT COUNT(*)::int AS count FROM support_messages WHERE conversation_id=$1', [conversation.id])).rows[0]?.count || 0);
  if (existing) return;
  const logs = (await q(env, `SELECT id,customer_message,assistant_reply,created_at FROM chat_logs WHERE tenant_id=$1 AND platform_id=$2 AND session_id=$3 ORDER BY id ASC LIMIT 200`, [scope.tenant_id,scope.platform_id,conversation.chat_session_id])).rows;
  for (const log of logs) {
    const customer = cleanText(log.customer_message, 12000);
    const assistant = cleanText(log.assistant_reply, 12000);
    if (customer) await appendSupportMessageDirect(q,env,scope,conversation.id,{ sender_type:'CUSTOMER',client_message_id:`chatlog:${log.id}:customer`,body_text:customer,sentence_count:countSentences(customer),created_at:log.created_at,metadata:{ source:'chat_log_import' } });
    if (assistant) await appendSupportMessageDirect(q,env,scope,conversation.id,{ sender_type:'AI',client_message_id:`chatlog:${log.id}:ai`,body_text:assistant,sentence_count:countSentences(assistant),created_at:log.created_at,metadata:{ source:'chat_log_import' } });
  }
}

export async function getHumanSupportSettings(env, scope, deps) {
  return supportSettingsOut(await ensureSettings(deps.q, env, scope));
}

export function customerRequestsContactInformation(message = '') {
  const value=String(message || '').normalize('NFKC').toLowerCase();
  const contactTerm=/(contact us|contact page|support page|support website|support link|customer service website|联系客服的方式|客服页面|ဆက်သွယ်ရန်|contact.*ဘယ်မှာ|website.*contact)/iu.test(value);
  const informationIntent=/(where|how|what|website|page|link|url|information|address|number|ဘယ်မှာ|ဘယ်လို|လင့်ခ်|ဝဘ်ဆိုက်|页面|网址|链接)/iu.test(value);
  return contactTerm && informationIntent;
}
export function customerExplicitlyRequestsHuman(message = '') {
  const value = String(message || '').normalize('NFKC').toLowerCase();
  if (customerRequestsContactInformation(value)) return false;
  return /(speak|talk|chat|connect|transfer|let me speak|i want|need).{0,24}(human|real person|live agent|customer service|support staff|operator|representative)|(?:human|real person|live agent|operator|representative).{0,20}(please|now|connect|talk|speak)|ဝန်ထမ်း(?:နဲ့|ကို).{0,20}(ပြော|ဆက်သွယ်|လွှဲ)|လူနဲ့.{0,20}ပြော|人工客服|转人工|找客服人员/iu.test(value);
}

export function normalizeAiHandoffResult(result, reason) {
  const normalizedResult = HANDOFF_RESULTS.has(String(result || '').toUpperCase()) ? String(result).toUpperCase() : 'ANSWERED';
  const normalizedReason = HANDOFF_REASONS.has(String(reason || '').toUpperCase()) ? String(reason).toUpperCase() : null;
  return { result:normalizedResult, handoff_reason:normalizedReason };
}

export function messageMatchesEscalationKeyword(message = '', settings = {}) {
  const source = String(settings?.escalation_keywords || '').split(/[\n,;]+/).map((item)=>item.trim().toLocaleLowerCase()).filter((item)=>item.length >= 2).slice(0,100);
  if (!source.length) return false;
  const normalized = String(message || '').normalize('NFKC').toLocaleLowerCase();
  return source.some((keyword)=>normalized.includes(keyword));
}

export function handoffOfferForResponse(settings, result, reason, clarificationAttempts = 0) {
  if (!settings?.human_support_enabled) return { offered:false, result, handoff_reason:reason };
  const shouldOffer = (result === 'HUMAN_RECOMMENDED' && !reason)
    || result === 'PROVIDER_ERROR' && settings.trigger_provider_error
    || reason === 'CUSTOMER_REQUESTED_HUMAN' && settings.trigger_customer_request
    || reason === 'REQUEST_NOT_UNDERSTOOD' && settings.trigger_not_understood
    || reason === 'OUTSIDE_ASSISTANT_SCOPE' && settings.trigger_outside_scope
    || reason === 'ACCOUNT_INVESTIGATION_REQUIRED' && settings.trigger_account_investigation
    || reason === 'MANUAL_ACTION_REQUIRED' && settings.trigger_manual_action
    || reason === 'ADMIN_KEYWORD'
    || (clarificationAttempts >= settings.maximum_clarification_attempts && settings.trigger_clarification_limit);
  return {
    offered:shouldOffer,
    result,
    handoff_reason:reason,
    button_text:settings.handoff_button_text,
    suggestion_message:settings.ai_suggestion_message,
  };
}


async function customerMessageWindow(q,env,conversation,limit=10,beforeSequence=0) {
  const safeLimit=Math.max(5,Math.min(50,Number(limit || 10)));
  const before=Math.max(0,Number(beforeSequence || 0));
  const params=[conversation.id,safeLimit];
  let where='sm.conversation_id=$1 AND sm.is_internal=FALSE';
  if (before>0) { params.splice(1,0,before); where+=' AND sm.message_sequence<$2'; }
  const limitRef='$'+params.length;
  const rows=(await q(env,`SELECT * FROM (SELECT sm.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS sender_name,sp.public_avatar_url AS sender_avatar_url FROM support_messages sm LEFT JOIN support_staff_profiles sp ON sp.id=sm.sender_staff_id WHERE ${where} ORDER BY sm.message_sequence DESC LIMIT ${limitRef}) page ORDER BY message_sequence ASC`,params)).rows.map(messageOut);
  const oldest=rows[0]?.message_sequence ? Number(rows[0].message_sequence) : 0;
  const hasOlder=oldest>0 && Number((await q(env,`SELECT COUNT(*)::int AS count FROM support_messages WHERE conversation_id=$1 AND is_internal=FALSE AND message_sequence<$2`,[conversation.id,oldest])).rows[0]?.count || 0)>0;
  return { messages:rows,has_older_messages:hasOlder,oldest_sequence:oldest };
}



function safeFilename(value='file') {
  const cleaned=String(value || 'file').normalize('NFKC').replace(/[^\p{L}\p{N}._ -]/gu,'_').replace(/\s+/g,' ').trim().slice(0,220);
  return cleaned || 'file';
}
function supportAttachmentType(bytes,mime='') {
  const type=String(mime || '').toLowerCase();
  if (bytes.length>=8 && bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47 && bytes[4]===0x0d && bytes[5]===0x0a && bytes[6]===0x1a && bytes[7]===0x0a) return type==='image/png' ? 'image/png' : '';
  if (bytes.length>=3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return type==='image/jpeg' ? 'image/jpeg' : '';
  if (bytes.length>=12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP') return type==='image/webp' ? 'image/webp' : '';
  if (bytes.length>=5 && String.fromCharCode(...bytes.slice(0,5))==='%PDF-') return type==='application/pdf' ? 'application/pdf' : '';
  if (type==='text/plain' && bytes.length && !bytes.slice(0,Math.min(bytes.length,8192)).some((x)=>x===0)) return 'text/plain';
  return '';
}
function supportExtForMime(mime) { return ({'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','application/pdf':'.pdf','text/plain':'.txt'})[mime] || ''; }
function maskIp(value='') {
  const ip=String(value || '').split(',')[0].trim();
  if (!ip) return '';
  if (ip.includes(':')) return `${ip.split(':').slice(0,4).join(':')}::`;
  const parts=ip.split('.'); return parts.length===4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : ip.slice(0,80);
}
function parseCustomerDevice(userAgent='') {
  const ua=String(userAgent || '').slice(0,1000);
  const browser=/Edg\/([\d.]+)/.exec(ua) ? ['Edge',RegExp.$1] : /Chrome\/([\d.]+)/.exec(ua) ? ['Chrome',RegExp.$1] : /Firefox\/([\d.]+)/.exec(ua) ? ['Firefox',RegExp.$1] : /Version\/([\d.]+).*Safari/.exec(ua) ? ['Safari',RegExp.$1] : ['Other',''];
  const os=/Windows NT/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS/iPadOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const device=/Mobile|Android|iPhone/.test(ua) ? 'Mobile' : /iPad|Tablet/.test(ua) ? 'Tablet' : 'Desktop';
  return { device_type:device,operating_system:os,browser_name:browser[0],browser_version:browser[1],user_agent:ua };
}
async function saveCustomerContext(deps,env,scope,conversationId,request,payload={}) {
  const conversation=(await deps.q(env,`SELECT id FROM support_conversations WHERE id=$1 AND tenant_id=$2 AND platform_id=$3`,[conversationId,scope.tenant_id,scope.platform_id])).rows[0];
  if (!conversation) throw supportError('Conversation not found',404,'SUPPORT_CONVERSATION_NOT_FOUND');
  const forwarded=request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
  const device=parseCustomerDevice(request.headers.get('user-agent') || payload.user_agent || '');
  const row=(await deps.q(env,`INSERT INTO support_customer_context(tenant_id,platform_id,conversation_id,ip_address,ip_masked,country_code,region_name,device_type,operating_system,browser_name,browser_version,user_agent,current_url,referrer_url,metadata_json)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb) RETURNING *`,[
      scope.tenant_id,scope.platform_id,conversationId,cleanText(forwarded,100),maskIp(forwarded),cleanText(request.headers.get('cf-ipcountry') || payload.country_code,8),cleanText(payload.region_name,160),device.device_type,device.operating_system,device.browser_name,device.browser_version,device.user_agent,cleanText(payload.current_url || request.headers.get('referer'),2000),cleanText(payload.referrer_url,2000),JSON.stringify(payload.metadata || {})
    ])).rows[0];
  await deps.q(env,`UPDATE support_conversations SET last_customer_context_id=$2,updated_at=NOW() WHERE id=$1`,[conversationId,row.id]);
  return { ...row,id:Number(row.id),conversation_id:Number(row.conversation_id),ip_address:row.ip_address || '',ip_masked:row.ip_masked || '' };
}
async function customerContext(deps,env,scope,conversationId,showIp=false) {
  const row=(await deps.q(env,`SELECT x.* FROM support_customer_context x WHERE x.conversation_id=$1 AND x.tenant_id=$2 AND x.platform_id=$3 ORDER BY x.id DESC LIMIT 1`,[conversationId,scope.tenant_id,scope.platform_id])).rows[0];
  if (!row) return null;
  return { id:Number(row.id),ip_address:showIp ? (row.ip_address || '') : (row.ip_masked || ''),ip_masked:row.ip_masked || '',country_code:row.country_code || '',region_name:row.region_name || '',device_type:row.device_type || '',operating_system:row.operating_system || '',browser_name:row.browser_name || '',browser_version:row.browser_version || '',current_url:row.current_url || '',referrer_url:row.referrer_url || '',captured_at:rowDate(row.captured_at) };
}
async function uploadSupportAttachment({ request,env,deps,scope,conversation,actorType,actorId,staff=null }) {
  if (!env.GUIDE_IMAGES) throw supportError('Attachment storage is not configured',503,'SUPPORT_ATTACHMENT_STORAGE_UNAVAILABLE');
  const settings=supportSettingsOut(await ensureSettings(deps.q,env,scope));
  if (actorType==='CUSTOMER' && settings.customer_attachments_enabled === false) throw supportError('Customer attachments are disabled',403,'SUPPORT_CUSTOMER_ATTACHMENTS_DISABLED');
  if (actorType!=='CUSTOMER' && settings.staff_attachments_enabled === false) throw supportError('Staff attachments are disabled',403,'SUPPORT_STAFF_ATTACHMENTS_DISABLED');
  if (conversation.control_mode!=='HUMAN' || !['ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED'].includes(conversation.status)) throw supportError('Attachments are available only during an active human-support conversation',409,'SUPPORT_ATTACHMENTS_HUMAN_ONLY');
  if (actorType==='STAFF' && Number(conversation.assigned_staff_id || 0)!==Number(staff?.id || 0)) throw supportError('Only the assigned staff member may send attachments',403,'SUPPORT_REPLY_OWNER_REQUIRED');
  const form=await request.formData(); const file=form.get('file');
  if (!file || typeof file==='string') throw supportError('Choose a file to upload',400,'SUPPORT_ATTACHMENT_REQUIRED');
  const max=Math.max(1024*1024,Math.min(25*1024*1024,Number(settings.attachment_max_bytes || 10*1024*1024)));
  if (!Number.isFinite(file.size) || file.size<1 || file.size>max) throw supportError(`File must be between 1 byte and ${Math.floor(max/1024/1024)} MB`,413,'SUPPORT_ATTACHMENT_SIZE_INVALID');
  const bytes=new Uint8Array(await file.arrayBuffer()); const detected=supportAttachmentType(bytes,file.type);
  const allowed=Array.isArray(settings.attachment_allowed_types_json) ? settings.attachment_allowed_types_json : [];
  if (!detected || !allowed.includes(detected)) throw supportError('Only approved JPG, PNG, WebP, PDF, and TXT files are allowed',415,'SUPPORT_ATTACHMENT_TYPE_NOT_ALLOWED');
  const original=safeFilename(file.name); const extension=supportExtForMime(detected); const safeBase=original.replace(/\.[a-z0-9]+$/i,'').slice(0,160) || 'file';
  const safeName=`${safeBase}${extension}`; const key=`tenant-${scope.tenant_id}/platform-${scope.platform_id}/support/conversation-${conversation.id}/${Date.now()}-${randomUUID()}${extension}`;
  await env.GUIDE_IMAGES.put(key,bytes,{ httpMetadata:{ contentType:detected },contentLength:bytes.byteLength });
  const publicUrl=`${new URL(request.url).origin}/uploads/${key}`; const digest=createHash('sha256').update(bytes).digest('hex');
  const inserted=(await deps.q(env,`INSERT INTO support_attachments(tenant_id,platform_id,conversation_id,uploaded_by_type,uploaded_by_id,original_name,safe_name,mime_type,size_bytes,storage_key,public_url,sha256,scan_status,status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending','active') RETURNING *`,[scope.tenant_id,scope.platform_id,conversation.id,actorType,String(actorId || ''),original,safeName,detected,bytes.byteLength,key,publicUrl,digest])).rows[0];
  const isImage=detected.startsWith('image/');
  const message=await appendSupportMessage(deps,env,scope,conversation.id,{ sender_type:actorType==='ADMIN'?'STAFF':actorType,sender_staff_id:staff?.id || null,client_message_id:cleanText(form.get('client_message_id'),120) || randomUUID(),message_type:isImage?'image':'attachment',body_text:cleanText(form.get('caption'),2000),attachment_url:publicUrl,attachment_name:original,attachment_content_type:detected,attachment_size_bytes:bytes.byteLength,sentence_count:0,metadata:{ attachment_id:Number(inserted.id),uploaded_by_type:actorType,scan_status:'pending',signature_validated:true,malware_scan:'not_configured' } });
  await deps.q(env,`UPDATE support_attachments SET message_id=$2 WHERE id=$1`,[inserted.id,message.id]);
  emitSupportEvent({ event:'support:message_created',platform_id:scope.platform_id,conversation_id:conversation.id,data:{ message:messageOut({ ...message,sender_name:staff?.display_name || (actorType==='ADMIN'?'Administrator':'Customer') }) } });
  return { attachment:{ ...inserted,id:Number(inserted.id),conversation_id:Number(inserted.conversation_id),message_id:Number(message.id),created_at:rowDate(inserted.created_at) },message:messageOut({ ...message,sender_name:staff?.display_name || (actorType==='ADMIN'?'Administrator':'Customer') }) };
}
function quickReplyOut(row={}) { return { id:Number(row.id || 0),scope_kind:row.scope_kind || 'platform',owner_staff_id:row.owner_staff_id ? Number(row.owner_staff_id) : null,title:row.title || '',shortcut:row.shortcut || '',category:row.category || 'General',message_text:row.message_text || '',enabled:row.enabled !== false,display_order:Number(row.display_order || 100),created_at:rowDate(row.created_at),updated_at:rowDate(row.updated_at) }; }
async function listSupportQuickReplies(deps,env,scope,staffId=null) {
  const rows=(await deps.q(env,`SELECT * FROM support_quick_replies WHERE tenant_id=$1 AND platform_id=$2 AND archived_at IS NULL AND enabled=TRUE AND (scope_kind='platform' OR owner_staff_id=$3) ORDER BY category,display_order,id`,[scope.tenant_id,scope.platform_id,staffId || null])).rows;
  return rows.map(quickReplyOut);
}
async function createSupportQuickReply(deps,env,scope,payload,actorType,actorId,ownerStaffId=null) {
  const scopeKind=actorType==='STAFF' ? 'personal' : (payload.scope_kind==='personal' && ownerStaffId ? 'personal' : 'platform');
  const message=cleanText(payload.message_text || payload.message,6000); const title=cleanText(payload.title,160);
  if (!title || !message) throw supportError('Quick reply title and message are required',400,'SUPPORT_QUICK_REPLY_REQUIRED');
  const row=(await deps.q(env,`INSERT INTO support_quick_replies(tenant_id,platform_id,scope_kind,owner_staff_id,title,shortcut,category,message_text,enabled,display_order,created_by_type,created_by_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[scope.tenant_id,scope.platform_id,scopeKind,scopeKind==='personal'?ownerStaffId:null,title,cleanText(payload.shortcut,80),cleanText(payload.category,100)||'General',message,payload.enabled!==false,Math.max(0,Math.min(9999,Number(payload.display_order || 100))),actorType,String(actorId || '')])).rows[0];
  return quickReplyOut(row);
}
function safePromotionUrl(value,{allowEmpty=true,image=false}={}) { const raw=cleanText(value,2000); if(!raw&&allowEmpty)return ''; if(/^\/uploads\//i.test(raw)&&image)return raw; try { const parsed=new URL(raw); if(parsed.protocol!=='https:') throw new Error('https'); return parsed.toString(); } catch { throw supportError(image?'Promotion image must be a safe HTTPS or uploaded URL':'Promotion link must use HTTPS',400,image?'PROMOTION_IMAGE_URL_INVALID':'PROMOTION_LINK_URL_INVALID'); } }
async function listPromotions(deps,env,scope,admin=false) {
  const live=admin ? '' : `AND enabled=TRUE AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>NOW())`;
  const rows=(await deps.q(env,`SELECT * FROM chat_promotional_items WHERE tenant_id=$1 AND platform_id=$2 AND archived_at IS NULL ${live} ORDER BY display_order,id`,[scope.tenant_id,scope.platform_id])).rows;
  return rows.map((row)=>({ ...row,id:Number(row.id),platform_id:Number(row.platform_id),tenant_id:Number(row.tenant_id),enabled:row.enabled!==false,display_order:Number(row.display_order || 100),created_at:rowDate(row.created_at),updated_at:rowDate(row.updated_at) }));
}

export async function handleSupportPublicRoute({ request, env, url, path, method, scope, deps }) {
  if (method === 'GET' && path === '/public/chat-promotions') return deps.jsonNoStore({ ok:true,items:await listPromotions(deps,env,scope,false) },200,env);
  if (method === 'GET' && (path === '/public/support/settings' || path === '/support/settings')) {
    const settings = await getHumanSupportSettings(env, scope, deps);
    return deps.jsonNoStore({ ok:true, support:{
      human_support_enabled:settings.human_support_enabled,
      handoff_button_text:settings.handoff_button_text,
      ai_suggestion_message:settings.ai_suggestion_message,
      waiting_message:settings.waiting_message,
      no_staff_online_message:settings.no_staff_online_message,
      heartbeat_interval_seconds:settings.heartbeat_interval_seconds,
      return_to_ai_on_resolve:settings.return_to_ai_on_resolve,
      poll_interval_ms:settings.realtime_poll_interval_ms,
      stream_enabled:settings.customer_stream_enabled,
      stream_heartbeat_seconds:settings.customer_stream_heartbeat_seconds,
      customer_messages:settings.customer_messages_json,
      attachments:{ customer_enabled:settings.customer_attachments_enabled === true, staff_enabled:settings.staff_attachments_enabled !== false, max_bytes:Number(settings.attachment_max_bytes || 10485760), allowed_types:settings.attachment_allowed_types_json || [] },
      identity:{ automated_name:settings.automated_support_display_name, automated_avatar_url:settings.automated_support_avatar_url, admin_name:settings.admin_support_display_name, admin_avatar_url:settings.admin_support_avatar_url, show_staff_public_name:settings.show_staff_public_name, show_staff_avatar:settings.show_staff_avatar },
      chat_menu:{ enabled:settings.chat_menu_enabled !== false, sticky_support_header:settings.sticky_support_header_enabled !== false },
      processing:{
        enabled:settings.processing_message_enabled,
        message:settings.processing_message_text,
        secondary_message:settings.processing_message_secondary_text,
        show_after_ms:settings.processing_message_delay_ms,
        secondary_after_ms:settings.processing_message_secondary_delay_ms,
        max_visible_ms:settings.processing_message_max_visible_ms,
        allow_additional_messages:false,
      },
    } }, 200, env);
  }
  if (method === 'POST' && path === '/support/handoff') {
    const payload = await deps.readJson(request);
    const settings = await getHumanSupportSettings(env, scope, deps);
    if (!settings.human_support_enabled) throw supportError('Human customer service handoff is disabled for this platform', 409, 'SUPPORT_HANDOFF_DISABLED');
    const chatSessionId = cleanText(payload.session_id, 160);
    if (!chatSessionId) throw supportError('Chat session ID is required', 400, 'SUPPORT_SESSION_REQUIRED');
    const chatSession = (await deps.q(env, `SELECT session_id,tenant_id,platform_id FROM chat_sessions WHERE session_id=$1 AND tenant_id=$2 AND platform_id=$3 LIMIT 1`, [chatSessionId,scope.tenant_id,scope.platform_id])).rows[0];
    if (!chatSession) throw supportError('Chat session does not belong to this platform', 403, 'SUPPORT_CHAT_SESSION_SCOPE_MISMATCH');
    const reason = HANDOFF_REASONS.has(String(payload.handoff_reason || '').toUpperCase()) ? String(payload.handoff_reason).toUpperCase() : 'CUSTOMER_REQUESTED_HUMAN';
    const detail = cleanText(payload.handoff_detail || payload.message, 2000);
    const resumeKey=createResumeKey();
    let conversation = (await deps.q(env, `INSERT INTO support_conversations(tenant_id,platform_id,chat_session_id,customer_identifier,customer_display_name,customer_locale,status,control_mode,handoff_reason,handoff_detail,queue_entered_at,last_message_at,return_to_ai_on_resolve,customer_resume_key_hash)
      VALUES($1,$2,$3,$4,$5,$6,'WAITING_FOR_AGENT','HUMAN',$7,$8,NOW(),NOW(),$9,$10)
      ON CONFLICT(platform_id,chat_session_id) DO UPDATE SET
        status=CASE WHEN support_conversations.status IN ('RESOLVED','CLOSED','AI_ACTIVE','HANDOFF_OFFERED') THEN 'WAITING_FOR_AGENT' ELSE support_conversations.status END,
        control_mode='HUMAN',active_ai_job_id=NULL,assigned_staff_id=CASE WHEN support_conversations.status IN ('RESOLVED','CLOSED','AI_ACTIVE','HANDOFF_OFFERED') THEN NULL ELSE support_conversations.assigned_staff_id END,
        handoff_reason=EXCLUDED.handoff_reason,handoff_detail=EXCLUDED.handoff_detail,customer_resume_key_hash=EXCLUDED.customer_resume_key_hash,queue_entered_at=COALESCE(support_conversations.queue_entered_at,NOW()),updated_at=NOW(),version=support_conversations.version+1
      RETURNING *`, [scope.tenant_id,scope.platform_id,chatSessionId,cleanText(payload.customer_identifier,255),cleanText(payload.customer_display_name,160),cleanText(payload.language || payload.locale,35),reason,detail,settings.return_to_ai_on_resolve !== false,sha256(resumeKey)])).rows[0];
    await deps.q(env,`UPDATE ai_jobs SET status=CASE WHEN status='PROCESSING' THEN 'SUPPRESSED' ELSE 'CANCELLED' END,completed_at=NOW(),last_error_code='HUMAN_HANDOFF_STARTED',locked_at=NULL,locked_by=NULL,updated_at=NOW() WHERE conversation_id=$1 AND status IN ('QUEUED','PROCESSING','RETRYING')`,[conversation.id]);
    await copyAiHistoryIntoSupport(deps.q, env, scope, conversation);
    try { await saveCustomerContext(deps,env,scope,conversation.id,request,{ current_url:payload.current_url,referrer_url:payload.referrer_url,user_agent:payload.user_agent,country_code:payload.country_code,region_name:payload.region_name }); } catch (_) {}
    await deps.q(env, `UPDATE chat_sessions SET human_support_state='WAITING_FOR_AGENT',updated_at=NOW() WHERE session_id=$1 AND tenant_id=$2 AND platform_id=$3`, [chatSessionId,scope.tenant_id,scope.platform_id]);
    await deps.q(env, `UPDATE chat_logs SET support_conversation_id=$1,handoff_reason=COALESCE(NULLIF(handoff_reason,''),$2) WHERE id=(SELECT id FROM chat_logs WHERE session_id=$3 AND tenant_id=$4 AND platform_id=$5 ORDER BY id DESC LIMIT 1)`, [conversation.id,reason,chatSessionId,scope.tenant_id,scope.platform_id]);
    const systemMessage = customerMessage(settings,payload.language || payload.locale,'waiting',settings.waiting_message);
    const systemId = `handoff:${conversation.id}:${conversation.version}`;
    await appendSupportMessage(deps,env,scope,conversation.id,{ sender_type:'SYSTEM',client_message_id:systemId,message_type:'system',body_text:systemMessage,sentence_count:countSentences(systemMessage),metadata:{ event:'handoff_requested' } });
    const activeCount = Number((await deps.q(env, `SELECT COUNT(*)::int AS count FROM support_staff_profiles WHERE tenant_id=$1 AND platform_id=$2 AND account_status='active' AND availability_status='active' AND archived_at IS NULL`, [scope.tenant_id,scope.platform_id])).rows[0]?.count || 0);
    const token = createSupportToken(env, { kind:'customer',tenant_id:scope.tenant_id,platform_id:scope.platform_id,conversation_id:Number(conversation.id),conversation_public_id:String(conversation.public_id),chat_session_id:chatSessionId }, 60 * 60 * 24);
    await supportAudit(deps.q,env,scope,'CUSTOMER',chatSessionId,'handoff_requested','support_conversation',conversation.id,reason,{ active_staff:activeCount });
    emitSupportEvent({ event:'support:conversation_created', platform_id:scope.platform_id, conversation_id:Number(conversation.id), data:{ conversation:conversationOut(conversation) } });
    emitSupportEvent({ event:'support:queue_updated', platform_id:scope.platform_id, data:{ reason:'handoff_created' } });
    return deps.jsonNoStore({ ok:true, conversation:conversationOut(conversation), support_token:token, resume_key:resumeKey, poll_interval_ms:settings.realtime_poll_interval_ms, active_staff:activeCount, message:activeCount ? customerMessage(settings,payload.language || payload.locale,'waiting',settings.waiting_message) : customerMessage(settings,payload.language || payload.locale,'no_staff',settings.no_staff_online_message) }, 201, env);
  }
  if (method === 'POST' && path === '/support/customer/resume') {
    const payload=await deps.readJson(request);
    const sessionId=cleanText(payload.session_id,160), resumeKey=cleanText(payload.resume_key,200);
    if (!sessionId) throw supportError('Chat session ID is required',400,'SUPPORT_SESSION_REQUIRED');
    let row=(await deps.q(env,`SELECT * FROM support_conversations WHERE tenant_id=$1 AND platform_id=$2 AND chat_session_id=$3 LIMIT 1`,[scope.tenant_id,scope.platform_id,sessionId])).rows[0];
    if (!row) throw supportError('No conversation is available to resume',404,'SUPPORT_RESUME_NOT_FOUND');
    let authorized=false;
    const currentToken=bearerToken(request);
    if (currentToken) { try { const current=await getCustomerByToken(env,currentToken,deps); authorized=Number(current.conversation.id)===Number(row.id); } catch {} }
    if (!authorized && row.customer_resume_key_hash && resumeKey) authorized=secureEqualHex(row.customer_resume_key_hash,sha256(resumeKey));
    if (!authorized) throw supportError('Conversation resume key is invalid',401,'SUPPORT_RESUME_KEY_INVALID');
    const nextResume=createResumeKey();
    row=(await deps.q(env,`UPDATE support_conversations SET customer_resume_key_hash=$2,updated_at=NOW() WHERE id=$1 RETURNING *`,[row.id,sha256(nextResume)])).rows[0];
    const token=createSupportToken(env,{ kind:'customer',tenant_id:row.tenant_id,platform_id:row.platform_id,conversation_id:Number(row.id),conversation_public_id:String(row.public_id),chat_session_id:row.chat_session_id },60*60*24);
    const detail=await customerMessageWindow(deps.q,env,row,10,0);
    const settings=supportSettingsOut(await ensureSettings(deps.q,env,row));
    return deps.jsonNoStore({ ok:true,conversation:conversationOut(row),...detail,active_ai_jobs:(await deps.q(env,`SELECT id,public_id,status,attempt_count,created_at,started_at FROM ai_jobs WHERE conversation_id=$1 AND status IN ('QUEUED','PROCESSING','RETRYING') ORDER BY id LIMIT 1`,[row.id])).rows,support_token:token,resume_key:nextResume,poll_interval_ms:settings.realtime_poll_interval_ms },200,env);
  }
  if (method === 'POST' && path === '/support/customer/realtime-ticket') {
    const customer=await getCustomerByToken(env,bearerToken(request),deps);
    const access={ kind:'customer',conversation:customer.conversation,tenant_id:customer.conversation.tenant_id,platform_id:customer.conversation.platform_id,conversation_id:customer.conversation.id };
    return deps.jsonNoStore({ ok:true,...await issueRealtimeTicket(env,access,deps) },201,env);
  }
  const customerConversationMatch = path.match(/^\/support\/customer\/conversations\/([0-9a-f-]+)$/i);
  const customerStreamMatch = path.match(/^\/support\/customer\/conversations\/([0-9a-f-]+)\/stream$/i);
  const customerSyncMatch = path.match(/^\/support\/customer\/conversations\/([0-9a-f-]+)\/sync$/i);
  const customerCancelMatch = path.match(/^\/support\/customer\/conversations\/([0-9a-f-]+)\/cancel-handoff$/i);
  const customerMessagesMatch = path.match(/^\/support\/customer\/conversations\/([0-9a-f-]+)\/messages$/i);
  const customerHistoryMatch = path.match(/^\/support\/customer\/conversations\/([0-9a-f-]+)\/history$/i);
  const customerAttachmentMatch = path.match(/^\/support\/customer\/conversations\/([0-9a-f-]+)\/attachments$/i);
  const customerContextMatch = path.match(/^\/support\/customer\/conversations\/([0-9a-f-]+)\/context$/i);
  if (customerStreamMatch && method === 'GET') return customerSupportStreamResponse(request,env,url,customerStreamMatch[1],deps);
  if (customerConversationMatch || customerSyncMatch || customerCancelMatch || customerMessagesMatch || customerHistoryMatch || customerAttachmentMatch || customerContextMatch) {
    const customer = await getCustomerByToken(env, bearerToken(request), deps);
    if (String(customer.conversation.public_id) !== String((customerConversationMatch || customerSyncMatch || customerCancelMatch || customerMessagesMatch || customerHistoryMatch || customerAttachmentMatch || customerContextMatch)[1])) throw supportError('Conversation token does not match this conversation', 403, 'SUPPORT_CUSTOMER_SCOPE_MISMATCH');
    if (method === 'GET' && customerConversationMatch) return deps.jsonNoStore({ conversation:conversationOut(customer.conversation),...await customerMessageWindow(deps.q,env,customer.conversation,10,0) },200,env);
    if (method === 'GET' && customerHistoryMatch) return deps.jsonNoStore({ ok:true,...await customerMessageWindow(deps.q,env,customer.conversation,Number(url.searchParams.get('limit') || 10),Number(url.searchParams.get('before_sequence') || 0)) },200,env);
    if (method === 'GET' && customerSyncMatch) {
      const after=Math.max(0,Number(url.searchParams.get('after_sequence') || 0));
      const rows=(await deps.q(env,`SELECT sm.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS sender_name,sp.public_avatar_url AS sender_avatar_url FROM support_messages sm LEFT JOIN support_staff_profiles sp ON sp.id=sm.sender_staff_id WHERE sm.conversation_id=$1 AND sm.message_sequence>$2 AND sm.is_internal=FALSE ORDER BY sm.message_sequence ASC LIMIT 500`,[customer.conversation.id,after])).rows.map(messageOut);
      const conversation=(await deps.q(env,`SELECT c.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS assigned_staff_name FROM support_conversations c LEFT JOIN support_staff_profiles sp ON sp.id=c.assigned_staff_id WHERE c.id=$1`,[customer.conversation.id])).rows[0];
      const jobs=(await deps.q(env,`SELECT id,public_id,status,attempt_count,created_at,started_at FROM ai_jobs WHERE conversation_id=$1 AND status IN ('QUEUED','PROCESSING','RETRYING') ORDER BY id LIMIT 20`,[customer.conversation.id])).rows.map((job)=>({ ...job,id:Number(job.id),attempt_count:Number(job.attempt_count || 0) }));
      return deps.jsonNoStore({ ok:true,conversation:conversationOut(conversation),messages:rows,active_ai_jobs:jobs },200,env);
    }
    if (method === 'POST' && customerCancelMatch) {
      const row=(await deps.q(env,`UPDATE support_conversations SET status='AI_ACTIVE',control_mode='AI',assigned_staff_id=NULL,handoff_reason=NULL,handoff_detail=NULL,queue_entered_at=NULL,updated_at=NOW(),version=version+1 WHERE id=$1 AND assigned_staff_id IS NULL AND status IN ('HANDOFF_OFFERED','WAITING_FOR_AGENT') RETURNING *`,[customer.conversation.id])).rows[0];
      if (!row) throw supportError('The conversation can no longer leave the queue automatically',409,'SUPPORT_CANCEL_HANDOFF_CONFLICT');
      await deps.q(env,`UPDATE chat_sessions SET human_support_state='AI_ACTIVE',updated_at=NOW() WHERE session_id=$1 AND tenant_id=$2 AND platform_id=$3`,[row.chat_session_id,row.tenant_id,row.platform_id]);
      emitSupportEvent({ event:'support:conversation_resolved',platform_id:row.platform_id,conversation_id:row.id,data:{ conversation:conversationOut(row),return_to_ai:true,cancelled_by_customer:true } });
      emitSupportEvent({ event:'support:queue_updated',platform_id:row.platform_id,data:{ reason:'customer_cancelled_handoff',conversation_id:row.id } });
      return deps.jsonNoStore({ ok:true,conversation:conversationOut(row),return_to_ai:true },200,env);
    }

    if (method === 'POST' && customerContextMatch) {
      const payload=await deps.readJson(request);
      const context=await saveCustomerContext(deps,env,{ tenant_id:customer.conversation.tenant_id,platform_id:customer.conversation.platform_id },customer.conversation.id,request,payload);
      return deps.jsonNoStore({ ok:true,context },201,env);
    }
    if (method === 'POST' && customerAttachmentMatch) {
      const latest=(await deps.q(env,`SELECT * FROM support_conversations WHERE id=$1`,[customer.conversation.id])).rows[0];
      const result=await uploadSupportAttachment({ request,env,deps,scope:{ tenant_id:latest.tenant_id,platform_id:latest.platform_id },conversation:latest,actorType:'CUSTOMER',actorId:latest.chat_session_id });
      return deps.jsonNoStore({ ok:true,...result },201,env);
    }
    if (method === 'POST' && customerMessagesMatch) {
      const payload = await deps.readJson(request);
      const body = cleanText(payload.body_text || payload.message, 12000);
      if (!body) throw supportError('Message is required',400,'SUPPORT_MESSAGE_REQUIRED');
      if (customer.conversation.status === 'RESOLVED' && customer.conversation.return_to_ai_on_resolve !== false) throw supportError('Conversation returned to brand support',409,'SUPPORT_RETURNED_TO_BRAND');
      if (customer.conversation.status === 'CLOSED') throw supportError('This conversation is closed',409,'SUPPORT_CONVERSATION_CLOSED');
      const clientId = cleanText(payload.client_message_id,120) || randomUUID();
      const row = await appendSupportMessage(deps,env,{ tenant_id:customer.conversation.tenant_id,platform_id:customer.conversation.platform_id },customer.conversation.id,{ sender_type:'CUSTOMER',client_message_id:clientId,body_text:body,sentence_count:countSentences(body),metadata:{ source:'customer_support_chat' } });
      emitSupportEvent({ event:'support:message_created', platform_id:customer.conversation.platform_id, conversation_id:customer.conversation.id, data:{ message:messageOut(row) } });
      return deps.jsonNoStore({ ok:true,message:messageOut(row) },201,env);
    }
  }
  return null;
}

async function staffLogin(request, env, deps) {
  const payload = await deps.readJson(request);
  const email = cleanEmail(payload.email);
  const password = String(payload.password || '');
  if (!email || !password) throw supportError('Email and password are required',400,'SUPPORT_LOGIN_REQUIRED');
  const row = (await deps.q(env, `SELECT au.*,sp.id AS staff_id,sp.tenant_id,sp.platform_id,sp.display_name,sp.public_display_name,sp.public_avatar_url,sp.role_key,sp.account_status,sp.availability_status,sp.timezone,sp.use_platform_timezone,sp.personal_timezone_allowed,sp.must_change_password,sp.max_active_conversations,sp.archived_at,sap.public_route_key AS staff_public_route_key
    FROM admin_users au JOIN support_staff_profiles sp ON sp.admin_user_id=au.id JOIN saas_platforms sap ON sap.id=sp.platform_id
    WHERE lower(au.email)=lower($1) AND au.role='support_staff' LIMIT 1`, [email])).rows[0];
  if (!row || row.is_active === false || row.account_status !== 'active' || row.archived_at || !await deps.verifyPassword(password,row.password_hash)) {
    throw supportError('Invalid email or password',401,'SUPPORT_LOGIN_INVALID');
  }
  const requestedRoute=cleanText(request.headers.get('x-bdg-platform-route'),140).toLowerCase();
  const originRaw=cleanText(request.headers.get('origin'),600);
  let origin=''; let originHostname='';
  if (originRaw) { try { const parsed=new URL(originRaw); if (parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port && parsed.pathname === '/' && !parsed.search && !parsed.hash) { origin=parsed.origin.toLowerCase(); originHostname=parsed.hostname.toLowerCase(); } } catch {} }
  const sharedStaffOrigin=String(env.LUKE_SHARED_STAFF_ORIGIN || 'https://staff.ar-ai666.com').replace(/\/$/,'').toLowerCase();
  if (origin === sharedStaffOrigin && !requestedRoute) throw supportError('This Luke Staff Console link is incomplete. Use the platform-specific /p/<route> link supplied by your administrator.',403,'SUPPORT_PLATFORM_ROUTE_REQUIRED');
  if (requestedRoute && requestedRoute !== String(row.staff_public_route_key || '').toLowerCase()) throw supportError('This staff account does not belong to this platform link',403,'SUPPORT_PLATFORM_ROUTE_MISMATCH');
  if (!requestedRoute && originHostname) {
    const custom=(await deps.q(env,`SELECT d.platform_id,p.tenant_id FROM saas_platform_domains d JOIN saas_platforms p ON p.id=d.platform_id JOIN saas_tenants t ON t.id=p.tenant_id WHERE lower(d.hostname)=lower($1) AND d.site_kind='staff' AND d.archived_at IS NULL AND d.cors_allowed IS TRUE AND d.provisioning_status='active' AND d.verified_at IS NOT NULL AND lower(COALESCE(d.cloudflare_status,''))='active' AND lower(COALESCE(d.cloudflare_ssl_status,''))='active' AND p.archived_at IS NULL AND p.status='active' AND t.archived_at IS NULL AND t.status='active' LIMIT 1`,[originHostname])).rows[0];
    if (!custom || Number(custom.platform_id)!==Number(row.platform_id) || Number(custom.tenant_id)!==Number(row.tenant_id)) throw supportError('This staff account does not belong to this verified Staff Console hostname',403,'SUPPORT_PLATFORM_HOST_MISMATCH');
  }
  if (!requestedRoute && !originHostname) throw supportError('A platform-scoped Staff Console route is required',403,'SUPPORT_PLATFORM_ROUTE_REQUIRED');
  const updated = (await deps.q(env, `UPDATE admin_users SET last_login_at=NOW(),updated_at=NOW(),session_version=COALESCE(session_version,0)+1 WHERE id=$1 RETURNING session_version`, [row.id])).rows[0];
  const session = (await deps.q(env, `INSERT INTO support_staff_sessions(tenant_id,platform_id,staff_id,session_version,user_agent,ip_address) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [row.tenant_id,row.platform_id,row.staff_id,Number(updated.session_version || 0),cleanText(request.headers.get('user-agent'),1000),cleanText(request.headers.get('x-forwarded-for'),100)])).rows[0];
  const token = createSupportToken(env, { kind:'staff',admin_user_id:Number(row.id),staff_id:Number(row.staff_id),tenant_id:Number(row.tenant_id),platform_id:Number(row.platform_id),sv:Number(updated.session_version || 0),session_id:Number(session.id) }, 60 * 60 * 12);
  const permissions = await staffPermissions(deps.q,env,row.staff_id);
  const staff = staffOut({ ...row,id:row.staff_id,last_login_at:new Date().toISOString() },permissions);
  await deps.q(env,'UPDATE support_staff_profiles SET last_login_at=NOW(),last_seen_at=NOW(),availability_status=\'invisible\',updated_at=NOW() WHERE id=$1',[row.staff_id]);
  await updatePresence(deps.q,env,{ ...staff,availability_status:'invisible' },'invisible',session.id);
  await supportAudit(deps.q,env,staff,'STAFF',staff.id,'login','support_staff',staff.id,'Support staff login');
  return deps.jsonNoStore({ access_token:token,token_type:'bearer',staff },200,env);
}

async function requireStaff(request, env, deps) {
  const token = bearerToken(request);
  if (!token) throw supportError('Missing staff token',401,'SUPPORT_TOKEN_REQUIRED');
  return getStaffByToken(env,token,deps);
}

async function finalizeSupportResolution(deps, env, scope, conversation, actorType, actorId, actorName = '') {
  if (!conversation) return null;
  const returnsToAi = conversation.return_to_ai_on_resolve !== false && conversation.control_mode === 'AI';
  const settings=supportSettingsOut(await ensureSettings(deps.q,env,scope));
  const text = returnsToAi
    ? customerMessage(settings,conversation.customer_locale,'resolved','Your customer-service request has been resolved. You can continue chatting here.')
    : 'This conversation has been closed.';
  const message = await appendSupportMessage(deps,env,scope,conversation.id,{
    sender_type:'SYSTEM',message_type:'system',body_text:text,sentence_count:1,
    metadata:{ event:'conversation_resolved',return_to_ai:returnsToAi,actor_type:actorType,actor_id:actorId,actor_name:actorName },
  });
  await deps.q(env,`UPDATE chat_sessions SET human_support_state=$2,clarification_attempts=0,updated_at=NOW() WHERE session_id=$1 AND tenant_id=$3 AND platform_id=$4`,[
    conversation.chat_session_id,returnsToAi ? 'AI_ACTIVE' : 'CLOSED',scope.tenant_id,scope.platform_id,
  ]);
  return { message,returnsToAi };
}

export async function handleSupportStaffRoute({ request, env, url, path, method, deps }) {
  if (method === 'POST' && path === '/staff/auth/login') return staffLogin(request,env,deps);
  if (!path.startsWith('/staff/')) return null;
  const staff = await requireStaff(request,env,deps);
  const scope = { tenant_id:staff.tenant_id,platform_id:staff.platform_id };
  await expireStalePresence(deps.q,env,scope);
  if (method === 'POST' && path === '/staff/realtime-ticket') {
    const access={ kind:'staff',staff,tenant_id:staff.tenant_id,platform_id:staff.platform_id,staff_id:staff.id };
    return deps.jsonNoStore({ ok:true,...await issueRealtimeTicket(env,access,deps) },201,env);
  }
  if (method === 'GET' && path === '/staff/me') {
    const settings = supportSettingsOut(await ensureSettings(deps.q,env,scope));
    return deps.jsonNoStore({ ok:true,staff,settings:{ platform_timezone:settings.platform_timezone,allow_staff_timezone_override:settings.allow_staff_timezone_override,heartbeat_interval_seconds:settings.heartbeat_interval_seconds,offline_timeout_seconds:settings.offline_timeout_seconds,return_to_ai_on_resolve:settings.return_to_ai_on_resolve,customer_attachments_enabled:settings.customer_attachments_enabled,staff_attachments_enabled:settings.staff_attachments_enabled,attachment_max_bytes:settings.attachment_max_bytes,attachment_allowed_types:settings.attachment_allowed_types_json } },200,env);
  }
  if (method === 'POST' && path === '/staff/logout') {
    await deps.q(env,`UPDATE support_staff_sessions SET signed_out_at=NOW() WHERE id=$1 AND staff_id=$2`,[staff.session_id,staff.id]);
    await updatePresence(deps.q,env,staff,'offline',staff.session_id);
    await releaseAssignedConversations(deps.q,env,scope,staff.id,'staff_logout');
    await supportAudit(deps.q,env,scope,'STAFF',staff.id,'logout','support_staff',staff.id,'Support staff logout');
    emitSupportEvent({ event:'support:force_logout', platform_id:staff.platform_id, staff_id:staff.id, data:{ reason:'logout' } });
    return deps.jsonNoStore({ ok:true },200,env);
  }
  if (method === 'POST' && path === '/staff/me/password') {
    const payload = await deps.readJson(request);
    const password = String(payload.password || payload.new_password || '');
    if (password.length < 12) throw supportError('Password must be at least 12 characters',400,'SUPPORT_PASSWORD_WEAK');
    await deps.q(env,`UPDATE admin_users SET password_hash=$1,session_version=COALESCE(session_version,0)+1,updated_at=NOW() WHERE id=$2`,[await deps.hashPassword(password),staff.admin_user_id]);
    await deps.q(env,`UPDATE support_staff_profiles SET must_change_password=FALSE,updated_at=NOW() WHERE id=$1`,[staff.id]);
    await supportAudit(deps.q,env,scope,'STAFF',staff.id,'password_changed','support_staff',staff.id,'Own password changed');
    emitSupportEvent({ event:'support:force_logout', platform_id:staff.platform_id, staff_id:staff.id, data:{ reason:'password_changed' } });
    return deps.jsonNoStore({ ok:true,relogin_required:true },200,env);
  }
  if (method === 'PUT' && path === '/staff/me/preferences') {
    const payload = await deps.readJson(request);
    const settings = supportSettingsOut(await ensureSettings(deps.q,env,scope));
    const usePlatform = payload.use_platform_timezone !== false;
    let timezone = '';
    if (!usePlatform) {
      if (!settings.allow_staff_timezone_override || !staff.personal_timezone_allowed) throw supportError('Personal timezone override is not allowed',403,'SUPPORT_TIMEZONE_OVERRIDE_DENIED');
      timezone = safeTimezone(payload.timezone,settings.platform_timezone);
    }
    await deps.q(env,`UPDATE support_staff_profiles SET use_platform_timezone=$1,timezone=$2,updated_at=NOW() WHERE id=$3`,[usePlatform,timezone || null,staff.id]);
    return deps.jsonNoStore({ ok:true },200,env);
  }
  if (method === 'POST' && path === '/staff/heartbeat') {
    await supportRealtimeHeartbeat(env,{ kind:'staff',staff },deps);
    const payload = await deps.readJson(request);
    if (['active','invisible'].includes(String(payload.status || '').toLowerCase()) && payload.status !== staff.availability_status) await updatePresence(deps.q,env,staff,String(payload.status).toLowerCase(),staff.session_id);
    return deps.jsonNoStore({ ok:true,server_time:new Date().toISOString() },200,env);
  }
  if (method === 'PUT' && path === '/staff/presence') {
    const payload = await deps.readJson(request);
    const status = String(payload.status || '').toLowerCase();
    if (!['active','invisible'].includes(status)) throw supportError('Status must be active or invisible',400,'SUPPORT_STATUS_INVALID');
    await updatePresence(deps.q,env,staff,status,staff.session_id);
    return deps.jsonNoStore({ ok:true,status },200,env);
  }
  if (method === 'GET' && path === '/staff/online') {
    const rows = (await deps.q(env,`SELECT sp.*,au.email FROM support_staff_profiles sp JOIN admin_users au ON au.id=sp.admin_user_id WHERE sp.tenant_id=$1 AND sp.platform_id=$2 AND sp.account_status='active' AND sp.archived_at IS NULL ORDER BY sp.availability_status,sp.display_name`,[scope.tenant_id,scope.platform_id])).rows;
    return deps.jsonNoStore(rows.map((row)=>staffOut(row,[])),200,env);
  }
  if (method === 'GET' && path === '/staff/conversations') {
    const tab = String(url.searchParams.get('tab') || 'mine').toLowerCase();
    let where = ''; let params = [];
    if (tab === 'waiting') { requirePermission(staff,'support.conversations.accept'); where = `AND c.status='WAITING_FOR_AGENT'`; }
    else if (tab === 'mine') { requirePermission(staff,'support.conversations.view_own'); where = `AND c.assigned_staff_id=$3 AND c.status NOT IN ('CLOSED')`; params=[staff.id]; }
    else if (tab === 'team') { requirePermission(staff,'support.conversations.view_team'); where = `AND c.status NOT IN ('CLOSED')`; }
    else if (tab === 'transferred') { where = `AND EXISTS(SELECT 1 FROM support_transfers t WHERE t.conversation_id=c.id AND (t.from_staff_id=$3 OR t.to_staff_id=$3))`; params=[staff.id]; }
    else if (tab === 'closed') { where = `AND c.status IN ('RESOLVED','CLOSED')`; }
    return deps.jsonNoStore(await listConversationRows(deps.q,env,scope,where,params,Number(url.searchParams.get('limit') || 100)),200,env);
  }
  const detailMatch = path.match(/^\/staff\/conversations\/(\d+)$/);
  const staffSyncMatch = path.match(/^\/staff\/conversations\/(\d+)\/sync$/);
  const staffStreamMatch = path.match(/^\/staff\/conversations\/(\d+)\/stream$/);
  if (method === 'GET' && staffStreamMatch) return staffSupportStreamResponse(request,env,url,numericId(staffStreamMatch[1],'Conversation ID'),staff,deps);
  if (method === 'GET' && staffSyncMatch) {
    const id=numericId(staffSyncMatch[1],'Conversation ID');
    if (!await supportRealtimeCanSubscribe(env,{ kind:'staff',staff,tenant_id:scope.tenant_id,platform_id:scope.platform_id,staff_id:staff.id },id,deps)) throw supportError('Conversation access denied',403,'SUPPORT_SUBSCRIBE_DENIED');
    const after=Math.max(0,Number(url.searchParams.get('after_sequence') || 0));
    const rows=(await deps.q(env,`SELECT sm.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS sender_name,sp.public_avatar_url AS sender_avatar_url FROM support_messages sm LEFT JOIN support_staff_profiles sp ON sp.id=sm.sender_staff_id WHERE sm.conversation_id=$1 AND sm.message_sequence>$2 ORDER BY sm.message_sequence ASC LIMIT 500`,[id,after])).rows.map(messageOut);
    const conversation=(await deps.q(env,`SELECT c.*,COALESCE(NULLIF(sp.public_display_name,''),sp.display_name) AS assigned_staff_name FROM support_conversations c LEFT JOIN support_staff_profiles sp ON sp.id=c.assigned_staff_id WHERE c.id=$1 AND c.tenant_id=$2 AND c.platform_id=$3`,[id,scope.tenant_id,scope.platform_id])).rows[0];
    return deps.jsonNoStore({ ok:true,conversation:conversationOut(conversation),messages:rows },200,env);
  }
  if (method === 'GET' && detailMatch) {
    const detail = await conversationDetail(deps.q,env,scope,detailMatch[1]);
    const own = Number(detail.conversation.assigned_staff_id || 0) === staff.id;
    if (!own) requirePermission(staff,'support.conversations.view_team');
    return deps.jsonNoStore(detail,200,env);
  }
  const acceptMatch = path.match(/^\/staff\/conversations\/(\d+)\/accept$/);
  if (method === 'POST' && acceptMatch) {
    requirePermission(staff,'support.conversations.accept');
    if (staff.availability_status !== 'active') throw supportError('Set your status to Active before accepting conversations',409,'SUPPORT_STAFF_NOT_ACTIVE');
    const activeCount = Number((await deps.q(env,`SELECT COUNT(*)::int AS count FROM support_conversations WHERE assigned_staff_id=$1 AND status IN ('ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED')`,[staff.id])).rows[0]?.count || 0);
    if (activeCount >= staff.max_active_conversations) throw supportError('Maximum active conversation limit reached',409,'SUPPORT_CAPACITY_REACHED');
    const id = numericId(acceptMatch[1],'Conversation ID');
    const acceptSettings=supportSettingsOut(await ensureSettings(deps.q,env,scope));
    const row = await deps.withTransaction(env,async (tq)=>{
      const accepted = (await tq(`UPDATE support_conversations SET assigned_staff_id=$1,status='AGENT_ACTIVE',control_mode='HUMAN',active_ai_job_id=NULL,first_assigned_at=COALESCE(first_assigned_at,NOW()),updated_at=NOW(),version=version+1
        WHERE id=$2 AND tenant_id=$3 AND platform_id=$4 AND status='WAITING_FOR_AGENT' AND assigned_staff_id IS NULL RETURNING *`,[staff.id,id,scope.tenant_id,scope.platform_id])).rows[0];
      if (!accepted) throw supportError('Conversation was already accepted by another staff member',409,'SUPPORT_ASSIGNMENT_CONFLICT');
      await tq(`UPDATE ai_jobs SET status=CASE WHEN status='PROCESSING' THEN 'SUPPRESSED' ELSE 'CANCELLED' END,completed_at=NOW(),last_error_code='AGENT_ACCEPTED',locked_at=NULL,locked_by=NULL,updated_at=NOW() WHERE conversation_id=$1 AND status IN ('QUEUED','PROCESSING','RETRYING')`,[id]);
      await tq(`INSERT INTO support_assignments(tenant_id,platform_id,conversation_id,staff_id,assigned_by_type,assigned_by_id,assignment_reason) VALUES($1,$2,$3,$4,'STAFF',$5,'manual queue acceptance')`,[scope.tenant_id,scope.platform_id,id,staff.id,String(staff.id)]);
      const acceptedText=customerMessage(acceptSettings,accepted.customer_locale,'agent_joined','A customer-service representative joined the conversation.'); await appendSupportMessageWithQuery(tq,scope,id,{ sender_type:'SYSTEM',message_type:'system',body_text:acceptedText,sentence_count:1,metadata:{ event:'agent_joined',staff_id:staff.id } });
      return accepted;
    });
    await supportAudit(deps.q,env,scope,'STAFF',staff.id,'conversation_accepted','support_conversation',id,'Manual queue acceptance');
    emitSupportEvent({ event:'support:conversation_assigned',platform_id:scope.platform_id,conversation_id:id,staff_id:staff.id,data:{ conversation:conversationOut(row),staff:staffOut(staff,[]) } });
    emitSupportEvent({ event:'support:queue_updated',platform_id:scope.platform_id,data:{ reason:'accepted',conversation_id:id } });
    return deps.jsonNoStore({ ok:true,conversation:conversationOut(row) },200,env);
  }
  const messageMatch = path.match(/^\/staff\/conversations\/(\d+)\/messages$/);
  if (method === 'POST' && messageMatch) {
    requirePermission(staff,'support.conversations.reply');
    const id = numericId(messageMatch[1],'Conversation ID');
    const conversation = (await deps.q(env,`SELECT * FROM support_conversations WHERE id=$1 AND tenant_id=$2 AND platform_id=$3`,[id,scope.tenant_id,scope.platform_id])).rows[0];
    if (!conversation) throw supportError('Conversation not found',404,'SUPPORT_CONVERSATION_NOT_FOUND');
    if (Number(conversation.assigned_staff_id || 0) !== staff.id) throw supportError('Only the assigned staff member may reply',403,'SUPPORT_REPLY_OWNER_REQUIRED');
    if (!['ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED'].includes(conversation.status)) throw supportError('Conversation is not active',409,'SUPPORT_CONVERSATION_NOT_ACTIVE');
    const payload = await deps.readJson(request);
    const body = cleanText(payload.body_text || payload.message,12000);
    if (!body) throw supportError('Message is required',400,'SUPPORT_MESSAGE_REQUIRED');
    const clientId = cleanText(payload.client_message_id,120) || randomUUID();
    const senderName=cleanText(staff.public_display_name || staff.display_name || 'Support',160); const senderAvatar=safeIdentityUrl(staff.public_avatar_url,true);
    const row = await appendSupportMessage(deps,env,scope,id,{ sender_type:'STAFF',sender_staff_id:staff.id,client_message_id:clientId,body_text:body,sentence_count:countSentences(body),metadata:{ source:'staff_console',sender_name:senderName,sender_avatar_url:senderAvatar } });
    await deps.q(env,`UPDATE support_conversations SET first_agent_reply_at=COALESCE(first_agent_reply_at,NOW()),status='AGENT_ACTIVE',control_mode='HUMAN',updated_at=NOW() WHERE id=$1`,[id]);
    await deps.q(env,`INSERT INTO support_activity_events(tenant_id,platform_id,staff_id,conversation_id,event_type,metadata_json) VALUES($1,$2,$3,$4,'reply_sent',$5::jsonb)`,[scope.tenant_id,scope.platform_id,staff.id,id,JSON.stringify({ sentence_count:countSentences(body),characters:body.length })]);
    emitSupportEvent({ event:'support:message_created',platform_id:scope.platform_id,conversation_id:id,staff_id:staff.id,data:{ message:messageOut({ ...row,sender_name:senderName,sender_avatar_url:senderAvatar }) } });
    return deps.jsonNoStore({ ok:true,message:messageOut({ ...row,sender_name:senderName,sender_avatar_url:senderAvatar }) },201,env);
  }
  const notesMatch = path.match(/^\/staff\/conversations\/(\d+)\/notes$/);
  if (method === 'POST' && notesMatch) {
    requirePermission(staff,'support.notes.create');
    const id = numericId(notesMatch[1],'Conversation ID');
    const payload = await deps.readJson(request);
    const note = cleanText(payload.note_text || payload.note,5000);
    if (!note) throw supportError('Note is required',400,'SUPPORT_NOTE_REQUIRED');
    const row = (await deps.q(env,`INSERT INTO support_internal_notes(tenant_id,platform_id,conversation_id,author_staff_id,note_text) SELECT $1,$2,c.id,$3,$4 FROM support_conversations c WHERE c.id=$5 AND c.tenant_id=$1 AND c.platform_id=$2 RETURNING *`,[scope.tenant_id,scope.platform_id,staff.id,note,id])).rows[0];
    if (!row) throw supportError('Conversation not found',404,'SUPPORT_CONVERSATION_NOT_FOUND');
    await supportAudit(deps.q,env,scope,'STAFF',staff.id,'internal_note_created','support_conversation',id,'Internal note created');
    return deps.jsonNoStore({ ok:true,note:{ ...row,id:Number(row.id),created_at:rowDate(row.created_at) } },201,env);
  }
  const transferMatch = path.match(/^\/staff\/conversations\/(\d+)\/transfer$/);
  if (method === 'POST' && transferMatch) {
    requirePermission(staff,'support.conversations.transfer');
    const id = numericId(transferMatch[1],'Conversation ID');
    const payload = await deps.readJson(request);
    const targetId = numericId(payload.target_staff_id,'Target staff ID');
    if (targetId === staff.id) throw supportError('Choose another staff member',400,'SUPPORT_TRANSFER_SELF');
    const target = (await deps.q(env,`SELECT * FROM support_staff_profiles WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND account_status='active' AND availability_status='active' AND archived_at IS NULL`,[targetId,scope.tenant_id,scope.platform_id])).rows[0];
    if (!target) throw supportError('Target staff member is not currently Active',409,'SUPPORT_TRANSFER_TARGET_UNAVAILABLE');
    const conversation = (await deps.q(env,`SELECT * FROM support_conversations WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND assigned_staff_id=$4 AND status IN ('ASSIGNED','AGENT_ACTIVE')`,[id,scope.tenant_id,scope.platform_id,staff.id])).rows[0];
    if (!conversation) throw supportError('Only the assigned staff member may transfer this conversation',403,'SUPPORT_TRANSFER_OWNER_REQUIRED');
    const reason = cleanText(payload.reason,2000);
    if (!reason) throw supportError('Transfer reason is required',400,'SUPPORT_TRANSFER_REASON_REQUIRED');
    const transfer = await deps.withTransaction(env,async (tq)=>{
      const locked = (await tq(`UPDATE support_conversations SET status='TRANSFER_REQUESTED',control_mode='HUMAN',updated_at=NOW(),version=version+1 WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND assigned_staff_id=$4 AND status IN ('ASSIGNED','AGENT_ACTIVE') RETURNING id`,[id,scope.tenant_id,scope.platform_id,staff.id])).rows[0];
      if (!locked) throw supportError('Conversation ownership changed before transfer request',409,'SUPPORT_TRANSFER_CONFLICT');
      return (await tq(`INSERT INTO support_transfers(tenant_id,platform_id,conversation_id,from_staff_id,to_staff_id,requested_by_type,requested_by_id,reason,internal_note) VALUES($1,$2,$3,$4,$5,'STAFF',$6,$7,$8) RETURNING *`,[scope.tenant_id,scope.platform_id,id,staff.id,targetId,String(staff.id),reason,cleanText(payload.internal_note,3000)])).rows[0];
    });
    await supportAudit(deps.q,env,scope,'STAFF',staff.id,'transfer_requested','support_transfer',transfer.id,reason,{ to_staff_id:targetId });
    emitSupportEvent({ event:'support:transfer_requested',platform_id:scope.platform_id,conversation_id:id,staff_id:targetId,data:{ transfer:{ ...transfer,id:Number(transfer.id) },from_staff:staff.display_name } });
    return deps.jsonNoStore({ ok:true,transfer:{ ...transfer,id:Number(transfer.id) } },201,env);
  }

  if (method === 'GET' && path === '/staff/quick-replies') {
    requirePermission(staff,'support.quick_replies.view');
    return deps.jsonNoStore(await listSupportQuickReplies(deps,env,scope,staff.id),200,env);
  }
  if (method === 'POST' && path === '/staff/quick-replies') {
    requirePermission(staff,'support.quick_replies.create_personal');
    const row=await createSupportQuickReply(deps,env,scope,await deps.readJson(request),'STAFF',staff.id,staff.id);
    await supportAudit(deps.q,env,scope,'STAFF',staff.id,'quick_reply_created','support_quick_reply',row.id,row.title);
    return deps.jsonNoStore({ ok:true,quick_reply:row },201,env);
  }
  const staffQuickDelete=path.match(/^\/staff\/quick-replies\/(\d+)$/);
  if (method === 'DELETE' && staffQuickDelete) {
    requirePermission(staff,'support.quick_replies.create_personal');
    const row=(await deps.q(env,`UPDATE support_quick_replies SET archived_at=NOW(),updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND scope_kind='personal' AND owner_staff_id=$4 RETURNING id`,[numericId(staffQuickDelete[1]),scope.tenant_id,scope.platform_id,staff.id])).rows[0];
    if (!row) throw supportError('Personal quick reply not found',404,'SUPPORT_QUICK_REPLY_NOT_FOUND');
    return deps.jsonNoStore({ ok:true },200,env);
  }
  const staffContextMatch=path.match(/^\/staff\/conversations\/(\d+)\/context$/);
  if (method === 'GET' && staffContextMatch) {
    requirePermission(staff,'support.conversations.view_customer_device');
    const id=numericId(staffContextMatch[1]);
    if (!await supportRealtimeCanSubscribe(env,{ kind:'staff',staff_id:staff.id,staff,platform_id:staff.platform_id,tenant_id:staff.tenant_id },id,{ q:deps.q })) throw supportError('Conversation access denied',403,'SUPPORT_SUBSCRIBE_DENIED');
    return deps.jsonNoStore({ ok:true,context:await customerContext(deps,env,scope,id,staff.permissions.includes('support.conversations.view_customer_ip')) },200,env);
  }
  const staffAttachmentMatch=path.match(/^\/staff\/conversations\/(\d+)\/attachments$/);
  if (method === 'POST' && staffAttachmentMatch) {
    requirePermission(staff,'support.attachments.send');
    const id=numericId(staffAttachmentMatch[1]);
    const conversation=(await deps.q(env,`SELECT * FROM support_conversations WHERE id=$1 AND tenant_id=$2 AND platform_id=$3`,[id,scope.tenant_id,scope.platform_id])).rows[0];
    if (!conversation) throw supportError('Conversation not found',404,'SUPPORT_CONVERSATION_NOT_FOUND');
    const result=await uploadSupportAttachment({ request,env,deps,scope,conversation,actorType:'STAFF',actorId:staff.id,staff });
    await supportAudit(deps.q,env,scope,'STAFF',staff.id,'attachment_sent','support_conversation',id,result.attachment.original_name);
    return deps.jsonNoStore({ ok:true,...result },201,env);
  }

  if (method === 'GET' && path === '/staff/transfers') {
    requirePermission(staff,'support.conversations.transfer');
    const status = ['requested','accepted','rejected','cancelled','forced'].includes(String(url.searchParams.get('status') || 'requested')) ? String(url.searchParams.get('status') || 'requested') : 'requested';
    const rows = (await deps.q(env,`SELECT t.*,c.public_id AS conversation_public_id,c.customer_identifier,c.customer_display_name,f.display_name AS from_staff_name,x.display_name AS to_staff_name
      FROM support_transfers t JOIN support_conversations c ON c.id=t.conversation_id
      LEFT JOIN support_staff_profiles f ON f.id=t.from_staff_id LEFT JOIN support_staff_profiles x ON x.id=t.to_staff_id
      WHERE t.tenant_id=$1 AND t.platform_id=$2 AND t.to_staff_id=$3 AND t.status=$4 ORDER BY t.requested_at DESC LIMIT 100`,[scope.tenant_id,scope.platform_id,staff.id,status])).rows;
    return deps.jsonNoStore(rows.map((row)=>({ ...row,id:Number(row.id),conversation_id:Number(row.conversation_id),from_staff_id:row.from_staff_id ? Number(row.from_staff_id) : null,to_staff_id:Number(row.to_staff_id),requested_at:rowDate(row.requested_at),responded_at:rowDate(row.responded_at),completed_at:rowDate(row.completed_at) })),200,env);
  }
  const transferResponse = path.match(/^\/staff\/transfers\/(\d+)\/(accept|reject)$/);
  if (method === 'POST' && transferResponse) {
    requirePermission(staff,'support.conversations.transfer');
    const transferId = numericId(transferResponse[1],'Transfer ID');
    const action = transferResponse[2];
    const transfer = (await deps.q(env,`SELECT * FROM support_transfers WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND to_staff_id=$4 AND status='requested'`,[transferId,scope.tenant_id,scope.platform_id,staff.id])).rows[0];
    if (!transfer) throw supportError('Transfer request is no longer available',409,'SUPPORT_TRANSFER_NOT_AVAILABLE');
    if (action === 'reject') {
      await deps.q(env,`UPDATE support_transfers SET status='rejected',responded_at=NOW() WHERE id=$1 AND status='requested'`,[transferId]);
      await deps.q(env,`UPDATE support_conversations SET status='AGENT_ACTIVE',updated_at=NOW(),version=version+1 WHERE id=$1 AND assigned_staff_id=$2`,[transfer.conversation_id,transfer.from_staff_id]);
      emitSupportEvent({ event:'support:transfer_rejected',platform_id:scope.platform_id,conversation_id:Number(transfer.conversation_id),staff_id:Number(transfer.from_staff_id),data:{ transfer_id:transferId } });
      return deps.jsonNoStore({ ok:true,status:'rejected' },200,env);
    }
    const changed = await deps.withTransaction(env,async (tq)=>{
      const accepted = (await tq(`UPDATE support_conversations SET assigned_staff_id=$1,status='AGENT_ACTIVE',control_mode='HUMAN',updated_at=NOW(),version=version+1 WHERE id=$2 AND tenant_id=$3 AND platform_id=$4 AND assigned_staff_id=$5 AND status='TRANSFER_REQUESTED' RETURNING *`,[staff.id,transfer.conversation_id,scope.tenant_id,scope.platform_id,transfer.from_staff_id])).rows[0];
      if (!accepted) throw supportError('Conversation ownership changed before the transfer was accepted',409,'SUPPORT_TRANSFER_CONFLICT');
      const transferChanged = (await tq(`UPDATE support_transfers SET status='accepted',responded_at=NOW(),completed_at=NOW() WHERE id=$1 AND status='requested' RETURNING id`,[transferId])).rows[0];
      if (!transferChanged) throw supportError('Transfer request was already handled',409,'SUPPORT_TRANSFER_CONFLICT');
      await tq(`UPDATE support_assignments SET released_at=NOW(),release_reason='transferred' WHERE conversation_id=$1 AND staff_id=$2 AND released_at IS NULL`,[transfer.conversation_id,transfer.from_staff_id]);
      await tq(`INSERT INTO support_assignments(tenant_id,platform_id,conversation_id,staff_id,assigned_by_type,assigned_by_id,assignment_reason) VALUES($1,$2,$3,$4,'STAFF',$5,'accepted transfer')`,[scope.tenant_id,scope.platform_id,transfer.conversation_id,staff.id,String(staff.id)]);
      await appendSupportMessageWithQuery(tq,scope,transfer.conversation_id,{ sender_type:'SYSTEM',message_type:'system',body_text:`Conversation transferred to ${staff.display_name}.`,sentence_count:1,metadata:{ event:'transfer_accepted',new_staff_id:staff.id } });
      return accepted;
    });
    await supportAudit(deps.q,env,scope,'STAFF',staff.id,'transfer_accepted','support_transfer',transferId,'Transfer accepted',{ from_staff_id:transfer.from_staff_id });
    emitSupportEvent({ event:'support:transfer_accepted',platform_id:scope.platform_id,conversation_id:Number(transfer.conversation_id),data:{ transfer_id:transferId,new_staff_id:staff.id,new_staff_name:staff.display_name } });
    return deps.jsonNoStore({ ok:true,status:'accepted',conversation:conversationOut(changed) },200,env);
  }
  const resolveMatch = path.match(/^\/staff\/conversations\/(\d+)\/(resolve|reopen)$/);
  if (method === 'POST' && resolveMatch) {
    requirePermission(staff,'support.conversations.resolve');
    const id = numericId(resolveMatch[1],'Conversation ID');
    const action = resolveMatch[2];
    const row = action === 'resolve'
      ? (await deps.q(env,`UPDATE support_conversations SET status='RESOLVED',control_mode=CASE WHEN return_to_ai_on_resolve THEN 'AI' ELSE 'CLOSED' END,assigned_staff_id=NULL,active_ai_job_id=NULL,resolved_at=NOW(),updated_at=NOW(),version=version+1 WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND assigned_staff_id=$4 AND status IN ('ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED') RETURNING *`,[id,scope.tenant_id,scope.platform_id,staff.id])).rows[0]
      : (await deps.q(env,`UPDATE support_conversations SET status='WAITING_FOR_AGENT',control_mode='HUMAN',assigned_staff_id=NULL,resolved_at=NULL,closed_at=NULL,queue_entered_at=NOW(),updated_at=NOW(),version=version+1 WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND status IN ('RESOLVED','CLOSED') RETURNING *`,[id,scope.tenant_id,scope.platform_id])).rows[0];
    if (!row) throw supportError('Conversation state could not be changed',409,'SUPPORT_STATE_CONFLICT');
    let resolution = null;
    if (action === 'resolve') {
      await deps.q(env,`UPDATE support_assignments SET released_at=NOW(),release_reason='resolved' WHERE conversation_id=$1 AND staff_id=$2 AND released_at IS NULL`,[id,staff.id]);
      resolution = await finalizeSupportResolution(deps,env,scope,row,'STAFF',staff.id,staff.display_name);
    } else {
      await deps.q(env,`UPDATE chat_sessions SET human_support_state='WAITING_FOR_AGENT',updated_at=NOW() WHERE session_id=$1 AND tenant_id=$2 AND platform_id=$3`,[row.chat_session_id,scope.tenant_id,scope.platform_id]);
    }
    await supportAudit(deps.q,env,scope,'STAFF',staff.id,`conversation_${action}d`,'support_conversation',id,`Conversation ${action}d`);
    if (resolution?.message) emitSupportEvent({ event:'support:message_created',platform_id:scope.platform_id,conversation_id:id,data:{ message:messageOut(resolution.message) } });
    emitSupportEvent({ event:action === 'resolve' ? 'support:conversation_resolved' : 'support:queue_updated',platform_id:scope.platform_id,conversation_id:id,data:{ conversation:conversationOut(row),return_to_ai:resolution?.returnsToAi === true } });
    return deps.jsonNoStore({ ok:true,conversation:conversationOut(row),return_to_ai:resolution?.returnsToAi === true },200,env);
  }
  if (method === 'GET' && path === '/staff/performance') {
    requirePermission(staff,'support.reports.view_own');
    const period = ['day','week','month'].includes(String(url.searchParams.get('period'))) ? String(url.searchParams.get('period')) : 'day';
    const interval = period === 'week' ? '7 days' : period === 'month' ? '30 days' : '1 day';
    const summary = (await deps.q(env,`SELECT
      (SELECT COUNT(DISTINCT a.conversation_id)::int FROM support_assignments a WHERE a.staff_id=$1 AND a.accepted_at > NOW() - $2::interval) AS conversations_served,
      (SELECT COUNT(*)::int FROM support_messages m WHERE m.sender_staff_id=$1 AND m.sender_type='STAFF' AND m.is_internal=FALSE AND m.created_at > NOW() - $2::interval) AS replies_sent,
      (SELECT COALESCE(SUM(m.sentence_count),0)::int FROM support_messages m WHERE m.sender_staff_id=$1 AND m.sender_type='STAFF' AND m.is_internal=FALSE AND m.created_at > NOW() - $2::interval) AS sentences_sent,
      (SELECT COUNT(DISTINCT c.id)::int FROM support_conversations c WHERE c.status IN ('RESOLVED','CLOSED') AND c.resolved_at > NOW() - $2::interval AND EXISTS(SELECT 1 FROM support_assignments a WHERE a.conversation_id=c.id AND a.staff_id=$1)) AS resolved_conversations,
      (SELECT COUNT(*)::int FROM support_transfers t WHERE t.from_staff_id=$1 AND t.requested_at > NOW() - $2::interval) AS transferred_conversations,
      (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (c.first_agent_reply_at-c.queue_entered_at))),0)::int FROM support_conversations c WHERE c.first_agent_reply_at IS NOT NULL AND c.queue_entered_at IS NOT NULL AND EXISTS(SELECT 1 FROM support_assignments a WHERE a.conversation_id=c.id AND a.staff_id=$1 AND a.accepted_at > NOW() - $2::interval)) AS avg_first_response_seconds,
      (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (c.resolved_at-c.first_assigned_at))),0)::int FROM support_conversations c WHERE c.resolved_at IS NOT NULL AND c.first_assigned_at IS NOT NULL AND EXISTS(SELECT 1 FROM support_assignments a WHERE a.conversation_id=c.id AND a.staff_id=$1 AND a.accepted_at > NOW() - $2::interval)) AS avg_conversation_seconds`,[staff.id,interval])).rows[0] || {};
    const durations = (await deps.q(env,`SELECT state,COALESCE(SUM(COALESCE(duration_seconds,EXTRACT(EPOCH FROM (NOW()-started_at))::int)),0)::int AS seconds FROM support_presence_sessions WHERE staff_id=$1 AND started_at > NOW() - $2::interval GROUP BY state`,[staff.id,interval])).rows;
    return deps.jsonNoStore({ period,...summary,presence:Object.fromEntries(durations.map((row)=>[row.state,Number(row.seconds || 0)])) },200,env);
  }
  throw supportError('Support staff route not found',404,'SUPPORT_ROUTE_NOT_FOUND');
}

function requireSupportAdmin(scope) {
  const allowed = new Set(['owner','tenant_owner','tenant_admin','platform_owner','platform_admin']);
  if (!scope || (!allowed.has(String(scope.admin_role || scope.membership_role || '')) && !scope.can_manage_platform)) {
    throw supportError('Customer Service administration permission required',403,'SUPPORT_ADMIN_PERMISSION_REQUIRED');
  }
}

async function adminListStaff(env,scope,deps) {
  await expireStalePresence(deps.q,env,scope);
  const rows = (await deps.q(env,`SELECT sp.*,au.email,au.name,au.is_active,au.session_version FROM support_staff_profiles sp JOIN admin_users au ON au.id=sp.admin_user_id WHERE sp.tenant_id=$1 AND sp.platform_id=$2 AND sp.archived_at IS NULL ORDER BY sp.display_name`,[scope.tenant_id,scope.platform_id])).rows;
  const result=[];
  for (const row of rows) result.push(staffOut(row,await staffPermissions(deps.q,env,row.id)));
  return result;
}

export async function handleSupportAdminRoute({ request, env, url, path, method, scope, admin, deps }) {
  if (!path.startsWith('/admin/support')) return null;
  requireSupportAdmin(scope);
  const adminStreamMatch=path.match(/^\/admin\/support\/conversations\/(\d+)\/stream$/i);
  if (adminStreamMatch && method==='GET') return adminSupportStreamResponse(request,env,url,numericId(adminStreamMatch[1]),scope,deps);
  if (method === 'GET' && path === '/admin/support/overview') {
    await expireStalePresence(deps.q,env,scope);
    const counts = (await deps.q(env,`SELECT
      COUNT(*) FILTER (WHERE account_status='active')::int AS staff_total,
      COUNT(*) FILTER (WHERE availability_status='active')::int AS staff_active,
      COUNT(*) FILTER (WHERE availability_status='invisible')::int AS staff_invisible,
      COUNT(*) FILTER (WHERE availability_status='offline')::int AS staff_offline
      FROM support_staff_profiles WHERE tenant_id=$1 AND platform_id=$2 AND archived_at IS NULL`,[scope.tenant_id,scope.platform_id])).rows[0] || {};
    const conversations = (await deps.q(env,`SELECT
      COUNT(*) FILTER (WHERE status='WAITING_FOR_AGENT')::int AS waiting,
      COUNT(*) FILTER (WHERE status IN ('ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED'))::int AS active,
      COUNT(*) FILTER (WHERE status='RESOLVED' AND resolved_at::date=CURRENT_DATE)::int AS resolved_today,
      COALESCE(AVG(EXTRACT(EPOCH FROM (first_agent_reply_at-queue_entered_at))) FILTER (WHERE first_agent_reply_at IS NOT NULL AND queue_entered_at IS NOT NULL AND created_at > NOW()-INTERVAL '7 days'),0)::int AS avg_first_response_seconds,
      COALESCE(AVG(EXTRACT(EPOCH FROM (NOW()-queue_entered_at))) FILTER (WHERE status='WAITING_FOR_AGENT' AND queue_entered_at IS NOT NULL),0)::int AS avg_waiting_seconds
      FROM support_conversations WHERE tenant_id=$1 AND platform_id=$2`,[scope.tenant_id,scope.platform_id])).rows[0] || {};
    const aiJobs = (await deps.q(env,`SELECT
      COUNT(*) FILTER (WHERE status='QUEUED')::int AS queued,
      COUNT(*) FILTER (WHERE status='PROCESSING')::int AS processing,
      COUNT(*) FILTER (WHERE status='RETRYING')::int AS retrying,
      COUNT(*) FILTER (WHERE status='FAILED' AND updated_at > NOW()-INTERVAL '24 hours')::int AS failed_24h,
      COUNT(*) FILTER (WHERE status='COMPLETED' AND completed_at > NOW()-INTERVAL '24 hours')::int AS completed_24h
      FROM ai_jobs WHERE tenant_id=$1 AND platform_id=$2`,[scope.tenant_id,scope.platform_id])).rows[0] || {};
    return deps.jsonNoStore({ ok:true,staff:counts,conversations,ai_jobs:aiJobs },200,env);
  }
  if (method === 'GET' && path === '/admin/support/ai-jobs') {
    const status = cleanText(url.searchParams.get('status') || '',30).toUpperCase();
    const allowed = ['QUEUED','PROCESSING','RETRYING','COMPLETED','FAILED','CANCELLED','SUPPRESSED'];
    const params=[scope.tenant_id,scope.platform_id];
    const filter=allowed.includes(status) ? ` AND j.status=$3` : '';
    if (filter) params.push(status);
    const rows=(await deps.q(env,`SELECT j.id,j.public_id,j.status,j.attempt_count,j.max_attempts,j.provider_status,j.provider_attempts,
      j.last_error_code,j.last_error_detail,j.selected_content_id,j.selected_match_score,j.selected_match_method,j.selected_asset_manifest,j.created_at,j.started_at,j.completed_at,j.available_at,
      c.public_id AS conversation_public_id,c.customer_identifier,c.customer_display_name,m.body_text AS customer_message
      FROM ai_jobs j
      JOIN support_conversations c ON c.id=j.conversation_id
      JOIN support_messages m ON m.id=j.customer_message_id
      WHERE j.tenant_id=$1 AND j.platform_id=$2${filter}
      ORDER BY CASE WHEN j.status IN ('PROCESSING','RETRYING','QUEUED') THEN 0 ELSE 1 END,j.updated_at DESC,j.id DESC LIMIT 200`,params)).rows;
    return deps.jsonNoStore(rows.map((row)=>({ ...row,id:Number(row.id),attempt_count:Number(row.attempt_count || 0),max_attempts:Number(row.max_attempts || 0),provider_attempts:Number(row.provider_attempts || 0),selected_content_id:row.selected_content_id ? Number(row.selected_content_id) : null,selected_match_score:row.selected_match_score == null ? null : Number(row.selected_match_score),selected_asset_manifest:parseJsonObject(row.selected_asset_manifest,{}),created_at:rowDate(row.created_at),started_at:rowDate(row.started_at),completed_at:rowDate(row.completed_at),available_at:rowDate(row.available_at) })),200,env);
  }
  if (method === 'GET' && path === '/admin/support/settings') return deps.jsonNoStore(supportSettingsOut(await ensureSettings(deps.q,env,scope)),200,env);
  if (method === 'PUT' && path === '/admin/support/settings') {
    const payload = await deps.readJson(request);
    const current = supportSettingsOut(await ensureSettings(deps.q,env,scope));
    const timezone = safeTimezone(payload.platform_timezone ?? current.platform_timezone,current.platform_timezone);
    let row = (await deps.q(env,`UPDATE support_settings SET
      human_support_enabled=$1,handoff_button_text=$2,ai_suggestion_message=$3,waiting_message=$4,no_staff_online_message=$5,fallback_message=$6,
      maximum_clarification_attempts=$7,trigger_customer_request=$8,trigger_not_understood=$9,trigger_outside_scope=$10,trigger_account_investigation=$11,
      trigger_manual_action=$12,trigger_provider_error=$13,trigger_clarification_limit=$14,escalation_keywords=$15,platform_timezone=$16,
      allow_staff_timezone_override=$17,heartbeat_interval_seconds=$18,offline_timeout_seconds=$19,idle_timeout_seconds=$20,
      force_logout_assignment_policy=$21,attachments_enabled=$22,updated_at=NOW()
      WHERE tenant_id=$23 AND platform_id=$24 RETURNING *`,[
        bool(payload.human_support_enabled,current.human_support_enabled),cleanText(payload.handoff_button_text ?? current.handoff_button_text,160),
        cleanText(payload.ai_suggestion_message ?? current.ai_suggestion_message,3000),cleanText(payload.waiting_message ?? current.waiting_message,3000),
        cleanText(payload.no_staff_online_message ?? current.no_staff_online_message,3000),cleanText(payload.fallback_message ?? current.fallback_message,3000),
        Math.min(10,Math.max(0,Number(payload.maximum_clarification_attempts ?? current.maximum_clarification_attempts))),
        bool(payload.trigger_customer_request,current.trigger_customer_request),bool(payload.trigger_not_understood,current.trigger_not_understood),
        bool(payload.trigger_outside_scope,current.trigger_outside_scope),bool(payload.trigger_account_investigation,current.trigger_account_investigation),
        bool(payload.trigger_manual_action,current.trigger_manual_action),bool(payload.trigger_provider_error,current.trigger_provider_error),
        bool(payload.trigger_clarification_limit,current.trigger_clarification_limit),cleanText(payload.escalation_keywords ?? current.escalation_keywords,5000),timezone,
        bool(payload.allow_staff_timezone_override,current.allow_staff_timezone_override),Math.min(120,Math.max(15,Number(payload.heartbeat_interval_seconds ?? current.heartbeat_interval_seconds))),
        Math.min(600,Math.max(45,Number(payload.offline_timeout_seconds ?? current.offline_timeout_seconds))),Math.min(3600,Math.max(60,Number(payload.idle_timeout_seconds ?? current.idle_timeout_seconds))),
        ['return_to_queue','keep_assigned','resolve'].includes(payload.force_logout_assignment_policy) ? payload.force_logout_assignment_policy : current.force_logout_assignment_policy,
        bool(payload.attachments_enabled,current.attachments_enabled),scope.tenant_id,scope.platform_id,
      ])).rows[0];
    row = (await deps.q(env,`UPDATE support_settings SET
      processing_message_enabled=$1,processing_message_text=$2,processing_message_secondary_text=$3,
      processing_message_delay_ms=$4,processing_message_secondary_delay_ms=$5,processing_message_max_visible_ms=$6,
      allow_messages_while_ai_processing=$7,provider_failure_message=$8,return_to_ai_on_resolve=$9,
      customer_messages_json=$10::jsonb,realtime_poll_interval_ms=$11,customer_stream_enabled=$12,customer_stream_heartbeat_seconds=$13,updated_at=NOW()
      WHERE tenant_id=$14 AND platform_id=$15 RETURNING *`,[
        bool(payload.processing_message_enabled,current.processing_message_enabled),
        cleanText(payload.processing_message_text ?? current.processing_message_text,3000),
        cleanText(payload.processing_message_secondary_text ?? current.processing_message_secondary_text,3000),
        Math.min(10000,Math.max(0,Number(payload.processing_message_delay_ms ?? current.processing_message_delay_ms))),
        Math.min(120000,Math.max(1000,Number(payload.processing_message_secondary_delay_ms ?? current.processing_message_secondary_delay_ms))),
        Math.min(300000,Math.max(5000,Number(payload.processing_message_max_visible_ms ?? current.processing_message_max_visible_ms))),
        false,
        cleanText(payload.provider_failure_message ?? current.provider_failure_message,3000),
        bool(payload.return_to_ai_on_resolve,current.return_to_ai_on_resolve),
        JSON.stringify(payload.customer_messages_json && typeof payload.customer_messages_json === 'object' ? payload.customer_messages_json : current.customer_messages_json || {}),
        Math.min(15000,Math.max(1500,Number(payload.realtime_poll_interval_ms ?? current.realtime_poll_interval_ms ?? 2500))),
        bool(payload.customer_stream_enabled,current.customer_stream_enabled),
        Math.min(45,Math.max(10,Number(payload.customer_stream_heartbeat_seconds ?? current.customer_stream_heartbeat_seconds ?? 15))),
        scope.tenant_id,scope.platform_id,
      ])).rows[0];
    row = (await deps.q(env,`UPDATE support_settings SET customer_attachments_enabled=$1,staff_attachments_enabled=$2,attachment_max_bytes=$3,attachment_allowed_types_json=$4::jsonb,updated_at=NOW() WHERE tenant_id=$5 AND platform_id=$6 RETURNING *`,[
      bool(payload.customer_attachments_enabled,current.customer_attachments_enabled),
      bool(payload.staff_attachments_enabled,current.staff_attachments_enabled),
      Math.max(1048576,Math.min(26214400,Number(payload.attachment_max_bytes ?? current.attachment_max_bytes ?? 10485760))),
      JSON.stringify(Array.isArray(payload.attachment_allowed_types_json) ? payload.attachment_allowed_types_json.filter((x)=>['image/png','image/jpeg','image/webp','application/pdf','text/plain'].includes(String(x))) : current.attachment_allowed_types_json || []),
      scope.tenant_id,scope.platform_id,
    ])).rows[0];
    row = (await deps.q(env,`UPDATE support_settings SET automated_support_display_name=$1,automated_support_avatar_url=$2,admin_support_display_name=$3,admin_support_avatar_url=$4,show_staff_public_name=$5,show_staff_avatar=$6,chat_menu_enabled=$7,sticky_support_header_enabled=$8,updated_at=NOW() WHERE tenant_id=$9 AND platform_id=$10 RETURNING *`,[
      cleanText(payload.automated_support_display_name ?? current.automated_support_display_name,160) || 'Support',
      safeIdentityUrl(payload.automated_support_avatar_url ?? current.automated_support_avatar_url,true),
      cleanText(payload.admin_support_display_name ?? current.admin_support_display_name,160) || 'Support Team',
      safeIdentityUrl(payload.admin_support_avatar_url ?? current.admin_support_avatar_url,true),
      bool(payload.show_staff_public_name,current.show_staff_public_name),bool(payload.show_staff_avatar,current.show_staff_avatar),
      bool(payload.chat_menu_enabled,current.chat_menu_enabled),bool(payload.sticky_support_header_enabled,current.sticky_support_header_enabled),
      scope.tenant_id,scope.platform_id,
    ])).rows[0];
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,'support_settings_updated','support_settings',row.id,'Human support and AI processing settings updated');
    return deps.jsonNoStore(supportSettingsOut(row),200,env);
  }
  if (method === 'GET' && path === '/admin/support/staff') return deps.jsonNoStore(await adminListStaff(env,scope,deps),200,env);
  if (method === 'POST' && path === '/admin/support/staff') {
    const payload = await deps.readJson(request);
    const email = cleanEmail(payload.email);
    const password = String(payload.temporary_password || payload.password || '');
    const displayName = cleanText(payload.display_name || payload.name,160);
    if (!email || !displayName) throw supportError('Name and email are required',400,'SUPPORT_STAFF_REQUIRED');
    if (password.length < 12) throw supportError('Temporary password must be at least 12 characters',400,'SUPPORT_PASSWORD_WEAK');
    const conflict = (await deps.q(env,'SELECT id FROM admin_users WHERE lower(email)=lower($1) LIMIT 1',[email])).rows[0];
    if (conflict) throw supportError('An account with this email already exists',409,'SUPPORT_EMAIL_EXISTS');
    const account = (await deps.q(env,`INSERT INTO admin_users(name,email,password_hash,role,is_active,session_version) VALUES($1,$2,$3,'support_staff',TRUE,0) RETURNING *`,[displayName,email,await deps.hashPassword(password)])).rows[0];
    const profile = (await deps.q(env,`INSERT INTO support_staff_profiles(admin_user_id,tenant_id,platform_id,display_name,public_display_name,public_avatar_url,role_key,account_status,timezone,use_platform_timezone,personal_timezone_allowed,must_change_password,max_active_conversations)
      VALUES($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,TRUE,$11) RETURNING *`,[account.id,scope.tenant_id,scope.platform_id,displayName,cleanText(payload.public_display_name || displayName,160),safeIdentityUrl(payload.public_avatar_url,true),cleanText(payload.role_key || 'support_agent',60),payload.timezone ? safeTimezone(payload.timezone) : null,payload.use_platform_timezone !== false,bool(payload.personal_timezone_allowed,false),Math.min(50,Math.max(1,Number(payload.max_active_conversations || 5)))])).rows[0];
    const requested = Array.isArray(payload.permissions) ? payload.permissions.filter((item)=>SUPPORT_PERMISSIONS.includes(item)) : [...DEFAULT_AGENT_PERMISSIONS];
    for (const permission of requested) await deps.q(env,`INSERT INTO support_staff_permissions(staff_id,permission_key,allowed) VALUES($1,$2,TRUE) ON CONFLICT(staff_id,permission_key) DO UPDATE SET allowed=TRUE,updated_at=NOW()`,[profile.id,permission]);
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,'support_staff_created','support_staff',profile.id,`Created ${email}`);
    return deps.jsonNoStore(staffOut({ ...profile,email },requested),201,env);
  }
  const staffMatch = path.match(/^\/admin\/support\/staff\/(\d+)$/);
  if (staffMatch && method === 'PUT') {
    const staffId = numericId(staffMatch[1],'Staff ID');
    const payload = await deps.readJson(request);
    const existing = (await deps.q(env,`SELECT sp.*,au.email,au.id AS account_id FROM support_staff_profiles sp JOIN admin_users au ON au.id=sp.admin_user_id WHERE sp.id=$1 AND sp.tenant_id=$2 AND sp.platform_id=$3 AND sp.archived_at IS NULL`,[staffId,scope.tenant_id,scope.platform_id])).rows[0];
    if (!existing) throw supportError('Staff account not found',404,'SUPPORT_STAFF_NOT_FOUND');
    const email = cleanEmail(payload.email || existing.email);
    const displayName = cleanText(payload.display_name || payload.name || existing.display_name,160);
    const accountStatus = payload.account_status === 'inactive' || payload.is_active === false ? 'inactive' : 'active';
    await deps.q(env,`UPDATE admin_users SET name=$1,email=$2,is_active=$3,updated_at=NOW(),session_version=CASE WHEN $3=FALSE THEN session_version+1 ELSE session_version END WHERE id=$4`,[displayName,email,accountStatus==='active',existing.account_id]);
    const profile = (await deps.q(env,`UPDATE support_staff_profiles SET display_name=$1,public_display_name=$2,public_avatar_url=$3,role_key=$4,account_status=$5,timezone=$6,use_platform_timezone=$7,personal_timezone_allowed=$8,max_active_conversations=$9,availability_status=CASE WHEN $5='inactive' THEN 'offline' ELSE availability_status END,updated_at=NOW() WHERE id=$10 RETURNING *`,[displayName,cleanText(payload.public_display_name ?? existing.public_display_name ?? displayName,160),safeIdentityUrl(payload.public_avatar_url ?? existing.public_avatar_url,true),cleanText(payload.role_key || existing.role_key,60),accountStatus,payload.timezone ? safeTimezone(payload.timezone) : existing.timezone,payload.use_platform_timezone ?? existing.use_platform_timezone,bool(payload.personal_timezone_allowed,existing.personal_timezone_allowed),Math.min(50,Math.max(1,Number(payload.max_active_conversations || existing.max_active_conversations))),staffId])).rows[0];
    if (Array.isArray(payload.permissions)) {
      await deps.q(env,'DELETE FROM support_staff_permissions WHERE staff_id=$1',[staffId]);
      for (const permission of payload.permissions.filter((item)=>SUPPORT_PERMISSIONS.includes(item))) await deps.q(env,`INSERT INTO support_staff_permissions(staff_id,permission_key,allowed) VALUES($1,$2,TRUE)`,[staffId,permission]);
    }
    if (accountStatus === 'inactive') {
      await deps.q(env,`UPDATE support_staff_sessions SET revoked_at=NOW(),revoke_reason='account_deactivated' WHERE staff_id=$1 AND revoked_at IS NULL`,[staffId]);
      await releaseAssignedConversations(deps.q,env,scope,staffId,'account_deactivated');
      emitSupportEvent({ event:'support:force_logout',platform_id:scope.platform_id,staff_id:staffId,data:{ reason:'account_deactivated' } });
    }
    const permissions = await staffPermissions(deps.q,env,staffId);
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,'support_staff_updated','support_staff',staffId,`Updated ${email}`);
    return deps.jsonNoStore(staffOut({ ...profile,email },permissions),200,env);
  }
  const resetMatch = path.match(/^\/admin\/support\/staff\/(\d+)\/password$/);
  if (method === 'POST' && resetMatch) {
    const staffId = numericId(resetMatch[1],'Staff ID');
    const payload = await deps.readJson(request);
    const password = String(payload.temporary_password || payload.password || '');
    if (password.length < 12) throw supportError('Temporary password must be at least 12 characters',400,'SUPPORT_PASSWORD_WEAK');
    const row = (await deps.q(env,`SELECT admin_user_id FROM support_staff_profiles WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND archived_at IS NULL`,[staffId,scope.tenant_id,scope.platform_id])).rows[0];
    if (!row) throw supportError('Staff account not found',404,'SUPPORT_STAFF_NOT_FOUND');
    await deps.q(env,`UPDATE admin_users SET password_hash=$1,session_version=session_version+1,updated_at=NOW() WHERE id=$2`,[await deps.hashPassword(password),row.admin_user_id]);
    await deps.q(env,`UPDATE support_staff_profiles SET must_change_password=TRUE,availability_status='offline',updated_at=NOW() WHERE id=$1`,[staffId]);
    emitSupportEvent({ event:'support:force_logout',platform_id:scope.platform_id,staff_id:staffId,data:{ reason:'password_reset' } });
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,'support_staff_password_reset','support_staff',staffId,'Temporary password set');
    return deps.jsonNoStore({ ok:true,must_change_password:true },200,env);
  }
  const forceLogoutMatch = path.match(/^\/admin\/support\/staff\/(\d+)\/force-logout$/);
  if (method === 'POST' && forceLogoutMatch) {
    const staffId = numericId(forceLogoutMatch[1],'Staff ID');
    const profile = (await deps.q(env,`SELECT sp.*,COALESCE(ss.force_logout_assignment_policy,'return_to_queue') AS force_logout_assignment_policy FROM support_staff_profiles sp LEFT JOIN support_settings ss ON ss.platform_id=sp.platform_id WHERE sp.id=$1 AND sp.tenant_id=$2 AND sp.platform_id=$3`,[staffId,scope.tenant_id,scope.platform_id])).rows[0];
    if (!profile) throw supportError('Staff account not found',404,'SUPPORT_STAFF_NOT_FOUND');
    await deps.q(env,`UPDATE admin_users SET session_version=session_version+1,updated_at=NOW() WHERE id=$1`,[profile.admin_user_id]);
    await deps.q(env,`UPDATE support_staff_sessions SET revoked_at=NOW(),revoke_reason='admin_force_logout' WHERE staff_id=$1 AND revoked_at IS NULL`,[staffId]);
    await updatePresence(deps.q,env,{ ...staffOut(profile,[]),tenant_id:scope.tenant_id,platform_id:scope.platform_id },'offline');
    if (profile.force_logout_assignment_policy === 'return_to_queue') {
      const returned = (await deps.q(env,`UPDATE support_conversations SET assigned_staff_id=NULL,status='WAITING_FOR_AGENT',control_mode='HUMAN',queue_entered_at=NOW(),updated_at=NOW(),version=version+1 WHERE assigned_staff_id=$1 AND tenant_id=$2 AND platform_id=$3 AND status IN ('ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED') RETURNING id`,[staffId,scope.tenant_id,scope.platform_id])).rows;
      for (const item of returned) emitSupportEvent({ event:'support:queue_updated',platform_id:scope.platform_id,conversation_id:Number(item.id),data:{ reason:'force_logout_returned' } });
    } else if (profile.force_logout_assignment_policy === 'resolve') {
      await deps.q(env,`UPDATE support_conversations SET status='RESOLVED',control_mode=CASE WHEN return_to_ai_on_resolve THEN 'AI' ELSE 'CLOSED' END,assigned_staff_id=NULL,resolved_at=NOW(),updated_at=NOW(),version=version+1 WHERE assigned_staff_id=$1 AND tenant_id=$2 AND platform_id=$3 AND status IN ('ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED')`,[staffId,scope.tenant_id,scope.platform_id]);
    }
    await deps.q(env,`UPDATE support_assignments SET released_at=NOW(),release_reason='force_logout' WHERE staff_id=$1 AND released_at IS NULL`,[staffId]);
    emitSupportEvent({ event:'support:force_logout',platform_id:scope.platform_id,staff_id:staffId,data:{ reason:'admin_force_logout' } });
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,'support_staff_force_logout','support_staff',staffId,'Admin forced logout');
    return deps.jsonNoStore({ ok:true,assignment_policy:profile.force_logout_assignment_policy },200,env);
  }
  if (method === 'GET' && path === '/admin/support/conversations') {
    const status = cleanText(url.searchParams.get('status'),40);
    const where = status && CONVERSATION_STATES.has(status) ? 'AND c.status=$3' : '';
    return deps.jsonNoStore(await listConversationRows(deps.q,env,scope,where,status ? [status] : [],Number(url.searchParams.get('limit') || 150)),200,env);
  }
  const adminDetail = path.match(/^\/admin\/support\/conversations\/(\d+)$/);
  if (method === 'GET' && adminDetail) return deps.jsonNoStore(await conversationDetail(deps.q,env,scope,adminDetail[1]),200,env);
  const adminAssign = path.match(/^\/admin\/support\/conversations\/(\d+)\/assign$/);
  if (method === 'POST' && adminAssign) {
    const id = numericId(adminAssign[1],'Conversation ID');
    const payload = await deps.readJson(request);
    const staffId = numericId(payload.staff_id,'Staff ID');
    const target = (await deps.q(env,`SELECT * FROM support_staff_profiles WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND account_status='active' AND archived_at IS NULL`,[staffId,scope.tenant_id,scope.platform_id])).rows[0];
    if (!target) throw supportError('Target staff account is unavailable',409,'SUPPORT_ASSIGNMENT_TARGET_INVALID');
    const previous = (await deps.q(env,`SELECT assigned_staff_id FROM support_conversations WHERE id=$1 AND tenant_id=$2 AND platform_id=$3`,[id,scope.tenant_id,scope.platform_id])).rows[0];
    const row = (await deps.q(env,`UPDATE support_conversations SET assigned_staff_id=$1,status='AGENT_ACTIVE',control_mode='HUMAN',active_ai_job_id=NULL,first_assigned_at=COALESCE(first_assigned_at,NOW()),updated_at=NOW(),version=version+1 WHERE id=$2 AND tenant_id=$3 AND platform_id=$4 RETURNING *`,[staffId,id,scope.tenant_id,scope.platform_id])).rows[0];
    if (!row) throw supportError('Conversation not found',404,'SUPPORT_CONVERSATION_NOT_FOUND');
    await deps.q(env,`UPDATE ai_jobs SET status=CASE WHEN status='PROCESSING' THEN 'SUPPRESSED' ELSE 'CANCELLED' END,completed_at=NOW(),last_error_code='ADMIN_ASSIGNED',locked_at=NULL,locked_by=NULL,updated_at=NOW() WHERE conversation_id=$1 AND status IN ('QUEUED','PROCESSING','RETRYING')`,[id]);
    if (previous?.assigned_staff_id) await deps.q(env,`UPDATE support_assignments SET released_at=NOW(),release_reason='admin_reassigned' WHERE conversation_id=$1 AND staff_id=$2 AND released_at IS NULL`,[id,previous.assigned_staff_id]);
    await deps.q(env,`INSERT INTO support_assignments(tenant_id,platform_id,conversation_id,staff_id,assigned_by_type,assigned_by_id,assignment_reason) VALUES($1,$2,$3,$4,'ADMIN',$5,$6)`,[scope.tenant_id,scope.platform_id,id,staffId,admin.email,cleanText(payload.reason || 'manual admin assignment',2000)]);
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,'conversation_assigned','support_conversation',id,'Admin assignment',{ staff_id:staffId });
    emitSupportEvent({ event:'support:conversation_assigned',platform_id:scope.platform_id,conversation_id:id,staff_id:staffId,data:{ conversation:conversationOut(row),forced:true } });
    return deps.jsonNoStore({ ok:true,conversation:conversationOut(row) },200,env);
  }
  const adminResolve = path.match(/^\/admin\/support\/conversations\/(\d+)\/(resolve|reopen)$/);
  if (method === 'POST' && adminResolve) {
    const id = numericId(adminResolve[1],'Conversation ID');
    const action = adminResolve[2];
    const row = action === 'resolve'
      ? (await deps.q(env,`UPDATE support_conversations SET status='RESOLVED',control_mode=CASE WHEN return_to_ai_on_resolve THEN 'AI' ELSE 'CLOSED' END,assigned_staff_id=NULL,active_ai_job_id=NULL,resolved_at=NOW(),updated_at=NOW(),version=version+1 WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 RETURNING *`,[id,scope.tenant_id,scope.platform_id])).rows[0]
      : (await deps.q(env,`UPDATE support_conversations SET status='WAITING_FOR_AGENT',control_mode='HUMAN',assigned_staff_id=NULL,resolved_at=NULL,closed_at=NULL,queue_entered_at=NOW(),updated_at=NOW(),version=version+1 WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 RETURNING *`,[id,scope.tenant_id,scope.platform_id])).rows[0];
    if (!row) throw supportError('Conversation not found',404,'SUPPORT_CONVERSATION_NOT_FOUND');
    let resolution = null;
    if (action === 'resolve') resolution = await finalizeSupportResolution(deps,env,scope,row,'ADMIN',admin.email,admin.email);
    else await deps.q(env,`UPDATE chat_sessions SET human_support_state='WAITING_FOR_AGENT',updated_at=NOW() WHERE session_id=$1 AND tenant_id=$2 AND platform_id=$3`,[row.chat_session_id,scope.tenant_id,scope.platform_id]);
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,`conversation_${action}d`,'support_conversation',id,`Admin ${action}d conversation`);
    if (resolution?.message) emitSupportEvent({ event:'support:message_created',platform_id:scope.platform_id,conversation_id:id,data:{ message:messageOut(resolution.message) } });
    emitSupportEvent({ event:action === 'resolve' ? 'support:conversation_resolved' : 'support:queue_updated',platform_id:scope.platform_id,conversation_id:id,data:{ conversation:conversationOut(row),admin:true,return_to_ai:resolution?.returnsToAi === true } });
    return deps.jsonNoStore({ ok:true,conversation:conversationOut(row),return_to_ai:resolution?.returnsToAi === true },200,env);
  }

  if (method === 'GET' && path === '/admin/support/quick-replies') return deps.jsonNoStore(await listSupportQuickReplies(deps,env,scope,null),200,env);
  if (method === 'POST' && path === '/admin/support/quick-replies') {
    const row=await createSupportQuickReply(deps,env,scope,await deps.readJson(request),'ADMIN',admin.email,null);
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,'quick_reply_created','support_quick_reply',row.id,row.title);
    return deps.jsonNoStore({ ok:true,quick_reply:row },201,env);
  }
  const adminQuick=path.match(/^\/admin\/support\/quick-replies\/(\d+)$/);
  if (adminQuick && method === 'PUT') {
    const id=numericId(adminQuick[1]); const payload=await deps.readJson(request);
    const row=(await deps.q(env,`UPDATE support_quick_replies SET title=$4,shortcut=$5,category=$6,message_text=$7,enabled=$8,display_order=$9,updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND scope_kind='platform' AND archived_at IS NULL RETURNING *`,[id,scope.tenant_id,scope.platform_id,cleanText(payload.title,160),cleanText(payload.shortcut,80),cleanText(payload.category,100)||'General',cleanText(payload.message_text,6000),payload.enabled!==false,Math.max(0,Math.min(9999,Number(payload.display_order||100)))] )).rows[0];
    if (!row) throw supportError('Platform quick reply not found',404,'SUPPORT_QUICK_REPLY_NOT_FOUND');
    return deps.jsonNoStore({ ok:true,quick_reply:quickReplyOut(row) },200,env);
  }
  if (adminQuick && method === 'DELETE') {
    const row=(await deps.q(env,`UPDATE support_quick_replies SET archived_at=NOW(),updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 AND scope_kind='platform' RETURNING id`,[numericId(adminQuick[1]),scope.tenant_id,scope.platform_id])).rows[0];
    if (!row) throw supportError('Platform quick reply not found',404,'SUPPORT_QUICK_REPLY_NOT_FOUND');
    return deps.jsonNoStore({ ok:true },200,env);
  }
  const adminContext=path.match(/^\/admin\/support\/conversations\/(\d+)\/context$/);
  if (method === 'GET' && adminContext) return deps.jsonNoStore({ ok:true,context:await customerContext(deps,env,scope,numericId(adminContext[1]),true) },200,env);
  const adminNote=path.match(/^\/admin\/support\/conversations\/(\d+)\/notes$/);
  if (method === 'POST' && adminNote) {
    const id=numericId(adminNote[1],'Conversation ID'); const payload=await deps.readJson(request); const note=cleanText(payload.note || payload.note_text,12000);
    if (!note) throw supportError('Internal note is required',400,'SUPPORT_NOTE_REQUIRED');
    const conversation=(await deps.q(env,`SELECT id FROM support_conversations WHERE id=$1 AND tenant_id=$2 AND platform_id=$3`,[id,scope.tenant_id,scope.platform_id])).rows[0];
    if (!conversation) throw supportError('Conversation not found',404,'SUPPORT_CONVERSATION_NOT_FOUND');
    const settings=supportSettingsOut(await ensureSettings(deps.q,env,scope));
    const row=(await deps.q(env,`INSERT INTO support_internal_notes(tenant_id,platform_id,conversation_id,author_admin_email,note_text) VALUES($1,$2,$3,$4,$5) RETURNING *`,[scope.tenant_id,scope.platform_id,id,admin.email,note])).rows[0];
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,'internal_note_created','support_conversation',id,'Administrator added an internal note');
    return deps.jsonNoStore({ ok:true,note:{ ...row,id:Number(row.id),author_name:settings.admin_support_display_name || 'Support Team',created_at:rowDate(row.created_at) } },201,env);
  }
  const adminMessage=path.match(/^\/admin\/support\/conversations\/(\d+)\/messages$/);
  if (method === 'POST' && adminMessage) {
    const id=numericId(adminMessage[1]); const payload=await deps.readJson(request); const body=cleanText(payload.body_text || payload.message,12000);
    if (!body) throw supportError('Message is required',400,'SUPPORT_MESSAGE_REQUIRED');
    const conversation=(await deps.q(env,`SELECT * FROM support_conversations WHERE id=$1 AND tenant_id=$2 AND platform_id=$3`,[id,scope.tenant_id,scope.platform_id])).rows[0];
    if (!conversation) throw supportError('Conversation not found',404,'SUPPORT_CONVERSATION_NOT_FOUND');
    if (conversation.control_mode!=='HUMAN' || !['WAITING_FOR_AGENT','ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED'].includes(conversation.status)) throw supportError('Admin replies are available only during human support',409,'SUPPORT_CONVERSATION_NOT_ACTIVE');
    const supportIdentity=supportSettingsOut(await ensureSettings(deps.q,env,scope));
    const senderName=cleanText(supportIdentity.admin_support_display_name || admin.name || 'Support Team',160);
    const senderAvatar=safeIdentityUrl(supportIdentity.admin_support_avatar_url,true);
    const row=await appendSupportMessage(deps,env,scope,id,{ sender_type:'STAFF',client_message_id:cleanText(payload.client_message_id,120)||randomUUID(),body_text:body,sentence_count:countSentences(body),metadata:{ source:'admin_workspace',sender_name:senderName,sender_avatar_url:senderAvatar,admin:true } });
    await deps.q(env,`UPDATE support_conversations SET first_agent_reply_at=COALESCE(first_agent_reply_at,NOW()),status='AGENT_ACTIVE',control_mode='HUMAN',updated_at=NOW() WHERE id=$1`,[id]);
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,'admin_reply_sent','support_conversation',id,'Administrator joined and replied');
    emitSupportEvent({ event:'support:message_created',platform_id:scope.platform_id,conversation_id:id,data:{ message:messageOut({ ...row,sender_name:senderName,sender_avatar_url:senderAvatar }) } });
    return deps.jsonNoStore({ ok:true,message:messageOut({ ...row,sender_name:senderName,sender_avatar_url:senderAvatar }) },201,env);
  }
  const adminAttachment=path.match(/^\/admin\/support\/conversations\/(\d+)\/attachments$/);
  if (method === 'POST' && adminAttachment) {
    const id=numericId(adminAttachment[1]); const conversation=(await deps.q(env,`SELECT * FROM support_conversations WHERE id=$1 AND tenant_id=$2 AND platform_id=$3`,[id,scope.tenant_id,scope.platform_id])).rows[0];
    if (!conversation) throw supportError('Conversation not found',404,'SUPPORT_CONVERSATION_NOT_FOUND');
    const result=await uploadSupportAttachment({ request,env,deps,scope,conversation,actorType:'ADMIN',actorId:admin.email,staff:{ id:null,display_name:admin.name || admin.email } });
    await supportAudit(deps.q,env,scope,'ADMIN',admin.email,'attachment_sent','support_conversation',id,result.attachment.original_name);
    return deps.jsonNoStore({ ok:true,...result },201,env);
  }
  if (method === 'GET' && path === '/admin/support/promotions') return deps.jsonNoStore({ ok:true,items:await listPromotions(deps,env,scope,true) },200,env);
  if (method === 'POST' && path === '/admin/support/promotions') {
    const payload=await deps.readJson(request); const image=safePromotionUrl(payload.image_url,{allowEmpty:false,image:true}); const link=safePromotionUrl(payload.link_url,{allowEmpty:true});
    const row=(await deps.q(env,`INSERT INTO chat_promotional_items(tenant_id,platform_id,title,subtitle,image_url,link_url,placement,enabled,display_order,starts_at,ends_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[scope.tenant_id,scope.platform_id,cleanText(payload.title,180),cleanText(payload.subtitle,2000),image,link,['welcome','conversation_top','before_first_message'].includes(payload.placement)?payload.placement:'welcome',payload.enabled!==false,Math.max(0,Math.min(9999,Number(payload.display_order||100))),payload.starts_at || null,payload.ends_at || null])).rows[0];
    return deps.jsonNoStore({ ok:true,item:{ ...row,id:Number(row.id) } },201,env);
  }
  const adminPromotion=path.match(/^\/admin\/support\/promotions\/(\d+)$/);
  if (adminPromotion && method === 'DELETE') {
    const row=(await deps.q(env,`UPDATE chat_promotional_items SET archived_at=NOW(),updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND platform_id=$3 RETURNING id`,[numericId(adminPromotion[1]),scope.tenant_id,scope.platform_id])).rows[0];
    if (!row) throw supportError('Promotion not found',404,'PROMOTION_NOT_FOUND');
    return deps.jsonNoStore({ ok:true },200,env);
  }

  if (method === 'GET' && path === '/admin/support/performance') {
    const rows = (await deps.q(env,`SELECT sp.id,sp.display_name,au.email,
      COALESCE(a.conversations_served,0)::int AS conversations_served,
      COALESCE(a.resolved_conversations,0)::int AS resolved_conversations,
      COALESCE(m.replies_sent,0)::int AS replies_sent,
      COALESCE(m.sentences_sent,0)::int AS sentences_sent,
      COALESCE(a.avg_first_response_seconds,0)::int AS avg_first_response_seconds,
      COALESCE(a.avg_conversation_seconds,0)::int AS avg_conversation_seconds
      FROM support_staff_profiles sp JOIN admin_users au ON au.id=sp.admin_user_id
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT x.conversation_id)::int AS conversations_served,
          COUNT(DISTINCT CASE WHEN c.status IN ('RESOLVED','CLOSED') THEN c.id END)::int AS resolved_conversations,
          COALESCE(AVG(EXTRACT(EPOCH FROM (c.first_agent_reply_at-c.queue_entered_at))) FILTER (WHERE c.first_agent_reply_at IS NOT NULL AND c.queue_entered_at IS NOT NULL),0)::int AS avg_first_response_seconds,
          COALESCE(AVG(EXTRACT(EPOCH FROM (c.resolved_at-c.first_assigned_at))) FILTER (WHERE c.resolved_at IS NOT NULL AND c.first_assigned_at IS NOT NULL),0)::int AS avg_conversation_seconds
        FROM support_assignments x LEFT JOIN support_conversations c ON c.id=x.conversation_id
        WHERE x.staff_id=sp.id AND x.accepted_at > NOW()-INTERVAL '30 days'
      ) a ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS replies_sent,COALESCE(SUM(sentence_count),0)::int AS sentences_sent
        FROM support_messages WHERE sender_staff_id=sp.id AND sender_type='STAFF' AND is_internal=FALSE AND created_at > NOW()-INTERVAL '30 days'
      ) m ON TRUE
      WHERE sp.tenant_id=$1 AND sp.platform_id=$2 AND sp.archived_at IS NULL
      ORDER BY conversations_served DESC,sp.display_name`,[scope.tenant_id,scope.platform_id])).rows;
    return deps.jsonNoStore(rows.map((row)=>({ ...row,id:Number(row.id),conversations_served:Number(row.conversations_served||0),resolved_conversations:Number(row.resolved_conversations||0),replies_sent:Number(row.replies_sent||0),sentences_sent:Number(row.sentences_sent||0),avg_first_response_seconds:Number(row.avg_first_response_seconds||0),avg_conversation_seconds:Number(row.avg_conversation_seconds||0) })),200,env);
  }
  if (method === 'GET' && path === '/admin/support/audit') {
    const rows = (await deps.q(env,`SELECT * FROM support_audit_events WHERE tenant_id=$1 AND platform_id=$2 ORDER BY id DESC LIMIT 300`,[scope.tenant_id,scope.platform_id])).rows;
    return deps.jsonNoStore(rows.map((row)=>({ ...row,id:Number(row.id),actor_identifier:row.actor_id || '',action_key:row.action || '',detail:row.details || '',created_at:rowDate(row.created_at) })),200,env);
  }
  throw supportError('Customer Service admin route not found',404,'SUPPORT_ADMIN_ROUTE_NOT_FOUND');
}
