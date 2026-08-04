import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
const emitter=new EventEmitter(); emitter.setMaxListeners(250);
export async function configureSupportEventBus(){ console.log(JSON.stringify({level:'info',event:'support_event_bus_ready',mode:'single-instance'})); }
export function onSupportEvent(listener){ emitter.on('event',listener); return()=>emitter.off('event',listener); }
export function emitSupportEvent(event){ const normalized={id:event?.id||randomUUID(),created_at:new Date().toISOString(),...event}; emitter.emit('event',normalized); return normalized; }
export async function closeSupportEventBus(){ emitter.removeAllListeners(); }
