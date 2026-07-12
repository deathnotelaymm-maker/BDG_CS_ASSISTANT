import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const name of ['guide-site', 'chat-site', 'admin-site']) {
  cpSync(join(root, name), join(dist, name), { recursive: true });
}
writeFileSync(join(dist, 'index.html'), `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BDG AI Mode</title><style>
body{margin:0;font-family:Inter,system-ui;background:#0c0906;color:#fff8de;display:grid;min-height:100vh;place-items:center}.card{width:min(92vw,680px);border:1px solid rgba(247,201,72,.28);border-radius:28px;padding:28px;background:linear-gradient(135deg,#25180e,#111);box-shadow:0 30px 90px rgba(0,0,0,.55)}h1{font-size:34px;margin:0 0 10px}.grid{display:grid;gap:12px;margin-top:22px}a{display:block;padding:16px 18px;border-radius:18px;background:linear-gradient(135deg,#ffe38b,#f7c948);color:#1a1208;text-decoration:none;font-weight:900}p{color:#c9b98a}</style></head><body><main class="card"><h1>BDG AI Mode v0.4.0</h1><p>Static preview landing. Deploy each site separately for production subdomains.</p><div class="grid"><a href="./guide-site/">Open Guide Site</a><a href="./chat-site/">Open AI Chat Site</a><a href="./admin-site/">Open Admin Site</a></div></main></body></html>`);
console.log('Built dist with guide-site, chat-site, admin-site.');
