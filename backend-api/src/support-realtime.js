import { WebSocketServer, WebSocket } from 'ws';
import { configureSupportEventBus, onSupportEvent } from './support-events.js';

function parseProtocols(header = '') {
  return String(header).split(',').map((value) => value.trim()).filter(Boolean);
}
function send(socket, event, data = {}) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ event, data, sent_at:new Date().toISOString() }));
}
function requestPath(request) {
  try { return new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname.replace(/\/+$/,'') || '/'; }
  catch { return ''; }
}

export async function attachSupportRealtimeGateway({ server, env, verifyAccess, heartbeat, presence, canSubscribe }) {
  await configureSupportEventBus(env);
  const wss = new WebSocketServer({ noServer:true, clientTracking:true, maxPayload:64 * 1024 });
  const connections = new Set();

  server.on('upgrade', async (request, socket, head) => {
    if (requestPath(request) !== '/support') return;
    try {
      const protocols = parseProtocols(request.headers['sec-websocket-protocol']);
      const token = protocols.find((value) => value !== 'bdg-support') || '';
      if (!token) throw new Error('Missing support WebSocket token');
      const access = await verifyAccess(env,token);
      wss.handleUpgrade(request,socket,head,(ws) => {
        ws.__supportAccess = access;
        wss.emit('connection',ws,request);
      });
    } catch (error) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Type: text/plain\r\n\r\nUnauthorized');
      socket.destroy();
    }
  });

  wss.on('connection',(socket) => {
    const access = socket.__supportAccess;
    const connection = {
      socket,
      access,
      platform_id:Number(access.platform_id),
      staff_id:access.kind === 'staff' ? Number(access.staff_id) : null,
      conversation_ids:new Set(access.kind === 'customer' ? [Number(access.conversation_id)] : []),
    };
    connections.add(connection);
    send(socket,'support:connect',{
      kind:access.kind,
      platform_id:connection.platform_id,
      staff:access.kind === 'staff' ? access.staff : undefined,
      conversation_id:access.kind === 'customer' ? Number(access.conversation_id) : undefined,
      heartbeat_interval_seconds:30,
    });

    socket.on('message',async (raw) => {
      let message;
      try { message=JSON.parse(String(raw || '')); } catch { return send(socket,'support:error',{ code:'INVALID_JSON',message:'Message must be valid JSON' }); }
      const event=String(message?.event || '');
      const data=message?.data || {};
      try {
        if (event === 'support:heartbeat') {
          await heartbeat(env,access);
          return send(socket,'support:heartbeat',{ ok:true,server_time:new Date().toISOString() });
        }
        if (event === 'support:presence' && access.kind === 'staff') {
          await presence(env,access,data.status);
          return send(socket,'support:presence',{ ok:true,status:data.status });
        }
        if (event === 'support:subscribe') {
          const conversationId=Number(data.conversation_id);
          if (!Number.isSafeInteger(conversationId) || conversationId < 1 || !await canSubscribe(env,access,conversationId)) {
            return send(socket,'support:error',{ code:'SUBSCRIBE_DENIED',message:'Conversation access denied' });
          }
          connection.conversation_ids.add(conversationId);
          return send(socket,'support:subscribed',{ conversation_id:conversationId });
        }
        if (event === 'support:unsubscribe') {
          const conversationId=Number(data.conversation_id);
          if (access.kind !== 'customer') connection.conversation_ids.delete(conversationId);
          return send(socket,'support:unsubscribed',{ conversation_id:conversationId });
        }
        if (event === 'support:typing') {
          const conversationId=Number(data.conversation_id || access.conversation_id);
          if (!connection.conversation_ids.has(conversationId) && !await canSubscribe(env,access,conversationId)) return;
          for (const target of connections) {
            if (target === connection || target.platform_id !== connection.platform_id || !target.conversation_ids.has(conversationId)) continue;
            send(target.socket,'support:typing',{ conversation_id:conversationId,actor:access.kind,staff_id:connection.staff_id,is_typing:data.is_typing === true });
          }
          return;
        }
      } catch (error) {
        send(socket,'support:error',{ code:error?.code || 'SUPPORT_REALTIME_ERROR',message:error?.message || 'Realtime request failed' });
      }
    });

    socket.on('close',()=>connections.delete(connection));
    socket.on('error',()=>connections.delete(connection));
  });

  const unsubscribe = onSupportEvent((envelope) => {
    const event = String(envelope.event || 'support:update');
    for (const connection of connections) {
      if (Number(envelope.platform_id || 0) && connection.platform_id !== Number(envelope.platform_id)) continue;
      const directStaff = Number(envelope.staff_id || 0);
      const conversationId = Number(envelope.conversation_id || 0);
      const direct = directStaff && connection.staff_id === directStaff;
      const inConversation = conversationId && connection.conversation_ids.has(conversationId);
      const platformBroadcast = !directStaff && !conversationId && connection.access.kind === 'staff';
      const queueBroadcast = event === 'support:queue_updated' && connection.access.kind === 'staff';
      if (direct || inConversation || platformBroadcast || queueBroadcast) send(connection.socket,event,envelope.data || {});
      if (event === 'support:force_logout' && direct && connection.access.kind === 'staff') {
        send(connection.socket,'support:force_logout',envelope.data || {});
        setTimeout(()=>connection.socket.close(4001,'Session revoked'),25);
      }
    }
  });

  const sweep = setInterval(() => {
    for (const connection of connections) {
      if (connection.socket.readyState !== WebSocket.OPEN) connections.delete(connection);
      else {
        try { connection.socket.ping(); } catch (_) {}
      }
    }
  },30000);
  sweep.unref?.();

  return {
    wss,
    close:async()=>{
      clearInterval(sweep);
      unsubscribe();
      for (const connection of connections) connection.socket.close(1001,'Server shutting down');
      await new Promise((resolve)=>wss.close(()=>resolve()));
    },
  };
}
