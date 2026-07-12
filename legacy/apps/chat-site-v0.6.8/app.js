const API = window.APP_CONFIG.API_BASE;
const $ = (id) => document.getElementById(id);
const messages = $('messages');
const state = {
  settings: {},
  sessionId: localStorage.getItem('chat_session_id') || `guest-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
  uploadUrls: []
};
localStorage.setItem('chat_session_id', state.sessionId);

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
function esc(text = '') { return String(text).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }

function addMessage(payload, who = 'bot', attachedImages = []) {
  const el = document.createElement('div');
  el.className = `bubble ${who}`;
  if (typeof payload === 'string') {
    el.textContent = payload;
    if (attachedImages.length) {
      const imgs = document.createElement('div');
      imgs.className = 'matched-images';
      imgs.innerHTML = attachedImages.map(url => `<img src="${esc(url)}" alt="Uploaded screenshot" />`).join('');
      el.appendChild(imgs);
    }
  } else {
    el.innerHTML = `<div class="reply-text">${esc(payload.reply || '').replace(/\n/g, '<br>')}</div>`;
    if (payload.matched_guides && payload.matched_guides.length) {
      const guides = document.createElement('div');
      guides.className = 'matched-guides';
      guides.innerHTML = payload.matched_guides.map(g => `<article class="match-card">
        <div><span class="tag">Matched Guide</span><h3>${esc(g.title)}</h3><p>${esc(g.summary || '')}</p></div>
        ${(g.image_urls || []).map(url => `<a href="${esc(url)}" target="_blank" rel="noreferrer"><img src="${esc(url)}" alt="${esc(g.title)} guide image" /></a>`).join('')}
      </article>`).join('');
      el.appendChild(guides);
    } else if (payload.guide_images && payload.guide_images.length) {
      const imgs = document.createElement('div');
      imgs.className = 'matched-images';
      imgs.innerHTML = payload.guide_images.map(url => `<a href="${esc(url)}" target="_blank" rel="noreferrer"><img src="${esc(url)}" alt="Guide image" /></a>`).join('');
      el.appendChild(imgs);
    }
    const meta = document.createElement('div');
    meta.className = 'sources';
    meta.textContent = `${payload.used_deepseek ? 'DeepSeek' : 'Local safe fallback'} · Memory session: ${payload.session_id || state.sessionId}`;
    el.appendChild(meta);
    if (payload.sources && payload.sources.length) {
      const s = document.createElement('div');
      s.className = 'sources';
      s.textContent = `Sources: ${payload.sources.join(', ')}`;
      el.appendChild(s);
    }
  }
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
}

function renderUploadPreview() {
  $('uploadPreview').innerHTML = state.uploadUrls.map(url => `<span><img src="${esc(url)}" alt="upload" /><button type="button" data-url="${esc(url)}">×</button></span>`).join('');
  $('uploadPreview').querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    state.uploadUrls = state.uploadUrls.filter(u => u !== btn.dataset.url);
    renderUploadPreview();
  }));
}

$('imageInput').addEventListener('change', async () => {
  const file = $('imageInput').files?.[0];
  if (!file) return;
  const data = new FormData();
  data.append('file', file);
  const bubble = document.createElement('div');
  bubble.className = 'bubble bot typing';
  bubble.textContent = 'Uploading image...';
  messages.appendChild(bubble);
  try {
    const res = await api('/chat/uploads', { method: 'POST', body: data });
    state.uploadUrls.push(res.url);
    renderUploadPreview();
    bubble.remove();
  } catch (err) {
    bubble.textContent = 'Image upload failed. Please try again.';
    console.error(err);
  } finally {
    $('imageInput').value = '';
  }
});

async function sendMessage(text) {
  const message = text.trim();
  if (!message && !state.uploadUrls.length) return;
  const attached = [...state.uploadUrls];
  addMessage(message || 'Uploaded image for checking', 'user', attached);
  $('messageInput').value = '';
  state.uploadUrls = [];
  renderUploadPreview();
  const typing = document.createElement('div');
  typing.className = 'bubble bot typing';
  typing.textContent = 'Checking AI prompt, memory, smart keywords and guide images...';
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;
  try {
    const data = await api('/chat', { method: 'POST', body: JSON.stringify({ message: message || 'Please check this uploaded image.', session_id: state.sessionId, image_urls: attached }) });
    if (data.session_id) { state.sessionId = data.session_id; localStorage.setItem('chat_session_id', state.sessionId); }
    typing.remove();
    addMessage(data, 'bot');
  } catch (err) {
    typing.remove();
    addMessage('Sorry, I cannot connect to AI support right now. Please check backend or contact official support.', 'bot');
    console.error(err);
  }
}


function renderQuickReplies() {
  const row = document.querySelector('.quick-row');
  if (!row) return;
  const replies = state.quick_replies.length ? state.quick_replies : [
    { text: 'How to withdraw?', query: 'How to withdraw?' },
    { text: 'How to bind bank card?', query: 'How to bind bank card?' },
    { text: 'How to deposit?', query: 'How to deposit?' },
    { text: 'I cannot login', query: 'I cannot login' }
  ];
  row.innerHTML = replies.map(r => `<button class="quick" data-q="${esc(r.query || r.text)}">${esc(r.text)}</button>`).join('');
  row.querySelectorAll('.quick').forEach(btn => btn.addEventListener('click', () => sendMessage(btn.dataset.q || btn.textContent)));
}

async function loadCmsContent() {
  try {
    const data = await api('/guide/content');
    state.quick_replies = data.quick_replies || [];
    const content = data.content || {};
    const notice = document.querySelector('.notice-card');
    if (notice) {
      notice.querySelector('.eyebrow').textContent = content.chat_eyebrow || 'Smart Guide AI';
      notice.querySelector('h1').textContent = content.chat_title || 'Ask a question. Get the matched guide image.';
      notice.querySelector('p:last-child').textContent = content.chat_subtitle || 'AI answers from admin-approved FAQ, guides, prompt rules, memory, and smart guide images.';
    }
  } catch (err) { console.warn('CMS quick replies fallback', err); }
  renderQuickReplies();
}

async function loadSettings() {
  try {
    state.settings = await api('/settings');
    const s = state.settings;
    $('siteName').textContent = s.app_name || window.APP_CONFIG.SITE_NAME;
    $('logoText').textContent = s.logo_text || 'BDG';
    $('supportLink').href = s.support_link || '#';
    $('guideLink').href = window.APP_CONFIG.GUIDE_URL || 'http://localhost:5501';
    document.title = `${s.logo_text || 'BDG'} AI Support`;
    if (s.primary_color) document.documentElement.style.setProperty('--gold', s.primary_color);
  } catch {}
}

$('chatForm').addEventListener('submit', (e) => { e.preventDefault(); sendMessage($('messageInput').value); });
loadSettings();
loadCmsContent();
