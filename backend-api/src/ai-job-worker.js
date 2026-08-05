import { randomUUID } from 'node:crypto';

export function startAiJobWorker({ env, processNext, intervalMs = 750, concurrency = 1 }) {
  const workerId = `ai-worker-${process.pid}-${randomUUID().slice(0,8)}`;
  let stopped = false;
  let timer = null;
  let running = 0;

  async function tick() {
    if (stopped) return;
    while (!stopped && running < concurrency) {
      running += 1;
      Promise.resolve(processNext(env, workerId))
        .catch((error) => console.error(JSON.stringify({ level:'error', event:'ai_worker_tick_failed', worker_id:workerId, message:error?.message || String(error), stack:error?.stack || undefined })))
        .finally(() => { running -= 1; });
      if (running >= concurrency) break;
    }
    timer = setTimeout(tick, intervalMs);
    timer.unref?.();
  }

  console.log(JSON.stringify({ level:'info', event:'ai_worker_started', worker_id:workerId, concurrency, interval_ms:intervalMs, queue:'postgresql' }));
  tick();

  return {
    workerId,
    async close() {
      stopped = true;
      if (timer) clearTimeout(timer);
      const deadline = Date.now() + 15000;
      while (running > 0 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
      console.log(JSON.stringify({ level:'info', event:'ai_worker_stopped', worker_id:workerId, remaining:running }));
    },
  };
}
