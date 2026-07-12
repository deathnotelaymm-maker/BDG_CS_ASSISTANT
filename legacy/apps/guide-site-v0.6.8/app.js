const API = window.APP_CONFIG.API_BASE;
const state = { guides: [], categories: [], faqs: [], q: '', category: '', faqCategory: '', settings: {}, content: {}, sections: {}, cards: [], nav: [], quick: [], guidesLoading: false, guidesError: null, faqsLoading: false, faqsError: null };
const $ = (id) => document.getElementById(id);

async function api(path) { const res = await fetch(`${API}${path}`); if (!res.ok) throw new Error(await res.text()); return res.json(); }
function esc(text = '') { return String(text).replace(/[&<>'"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
const attr = esc;
function skeletons(count, cls = 'guide') { return Array.from({ length: count }).map(() => `<div class="skeleton ${cls}"></div>`).join(''); }
function stateBlock({ icon = '📭', title = 'Nothing here yet', message = '', action = '', variant = '' }) { return `<div class="state ${variant}"><div class="state-icon">${icon}</div><strong>${esc(title)}</strong><span>${esc(message)}</span>${action || ''}</div>`; }
function content(key, fallback='') { return state.content?.[key] || fallback; }
function sectionEnabled(key) { return state.sections[key] !== false; }
function setDisplay(id, show) { const el = $(id); if (el) el.style.display = show ? '' : 'none'; }

function renderDynamicContent() {
  $('siteName').textContent = state.settings.app_name || window.APP_CONFIG.SITE_NAME || 'BDG Help Center';
  $('logoText').textContent = (state.settings.logo_text || 'BDG').slice(0,4);
  $('headerStatus').textContent = content('header_status', 'Official Help Center');
  $('heroEyebrow').textContent = content('hero_eyebrow', '24/7 · HELP & GUIDE');
  $('bannerTitle').textContent = content('hero_title', state.settings.banner_title || 'BDG Mobile Help Center');
  $('bannerSubtitle').textContent = content('hero_subtitle', state.settings.banner_subtitle || 'Search FAQ and view official guide images.');
  $('searchInput').placeholder = content('search_placeholder', 'Search help, FAQ, or guide');
  $('popularTitle').textContent = content('popular_title', 'Popular Help');
  $('topicsTitle').textContent = content('topics_title', 'Topics');
  $('resultTitle').textContent = content('guides_title', 'Official Guides');
  $('faqTitle').textContent = content('faq_title', 'Frequently Asked');
  $('supportButtonText').textContent = content('support_button_text', 'Support');
  $('footerNote').textContent = content('footer_note', 'Official BDG Mobile Help Center');
  $('supportBlockTitle').textContent = content('support_block_title', 'Need official support?');
  $('supportBlockText').textContent = content('support_block_text', 'Contact official support for account, payment, or withdrawal checking.');
  const supportUrl = state.settings.support_link || '#';
  $('supportLink').href = supportUrl; $('supportBlockLink').href = supportUrl;
  document.title = state.settings.app_name || window.APP_CONFIG.SITE_NAME || 'BDG Help Center';
  if (state.settings.primary_color) document.documentElement.style.setProperty('--gold', state.settings.primary_color);
  setDisplay('heroSection', sectionEnabled('hero'));
  setDisplay('popularSection', sectionEnabled('popular'));
  setDisplay('topicsSection', sectionEnabled('topics'));
  setDisplay('guidesSection', sectionEnabled('guides'));
  setDisplay('faqSection', sectionEnabled('faq'));
  setDisplay('supportSection', sectionEnabled('support'));
}
function renderPopularHelp() {
  const cards = state.cards.length ? state.cards : [
    { title:'Deposit', subtitle:'Add funds to your account', icon:'💰', query:'deposit' },
    { title:'Withdrawal', subtitle:'Cash out safely', icon:'💳', query:'withdrawal' },
    { title:'Bank Card', subtitle:'Link or verify your card', icon:'🏦', query:'bank card' },
    { title:'Login', subtitle:'Sign-in and password help', icon:'🔐', query:'login' },
  ];
  $('popularGrid').innerHTML = cards.map(c => `<button class="pop-card" data-q="${attr(c.query || c.title)}"><span class="pop-icon">${esc(c.icon || '✨')}</span><strong>${esc(c.title)}</strong><small>${esc(c.subtitle || '')}</small></button>`).join('');
  document.querySelectorAll('#popularGrid [data-q]').forEach(el => el.addEventListener('click', () => searchBy(el.dataset.q)));
}
function renderQuickChips() {
  const chips = state.quick.length ? state.quick : [
    { text:'Deposit', query:'deposit' }, { text:'Withdrawal', query:'withdrawal' }, { text:'Bank Card', query:'bank card' }, { text:'Login', query:'login' }
  ];
  $('quickChips').innerHTML = chips.map(c => `<button class="chip" data-q="${attr(c.query || c.text)}" role="listitem">${esc(c.text)}</button>`).join('');
  document.querySelectorAll('#quickChips [data-q]').forEach(el => el.addEventListener('click', () => searchBy(el.dataset.q)));
}
function renderBottomNav() {
  const nav = state.nav.length ? state.nav : [
    { nav_key:'home', label:'Home', icon:'🏠', href:'#' }, { nav_key:'guides', label:'Guides', icon:'📖', href:'#guidesSection' }, { nav_key:'faq', label:'FAQ', icon:'❓', href:'#faqSection' }, { nav_key:'support', label:'Support', icon:'🎧', href:'support' }
  ];
  const supportUrl = state.settings.support_link || '#';
  $('bottomNav').innerHTML = nav.filter(n => n.nav_key !== 'ai' && !/ai/i.test(n.label)).map((n, i) => {
    const href = n.href === 'support' ? supportUrl : (n.href || '#');
    const target = n.href === 'support' || /^https?:/.test(href) ? ' target="_blank" rel="noreferrer"' : '';
    return `<a class="nav-item ${i===0?'active':''}" href="${attr(href)}" data-nav="${attr(n.nav_key)}"${target}><span aria-hidden="true">${esc(n.icon || '•')}</span><span class="nav-label">${esc(n.label)}</span></a>`;
  }).join('');
  document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); el.classList.add('active'); }));
}
function renderCategories() { const all = state.category === '' ? 'topic active' : 'topic'; const list = [`<button class="${all}" data-slug=""><b>✨</b><span>All</span></button>`].concat(state.categories.map(c => `<button class="topic${state.category === c.slug ? ' active' : ''}" data-slug="${attr(c.slug)}"><b>${esc(c.icon || '🎯')}</b><span>${esc(c.name)}</span></button>`)); $('categories').innerHTML = list.join(''); document.querySelectorAll('#categories .topic').forEach(el => el.addEventListener('click', () => { state.category = el.dataset.slug || ''; state.q = ''; $('searchInput').value = ''; renderCategories(); loadGuides(); })); }
function guideThumb(g) { return g.image_urls?.[0] ? `<img src="${attr(g.image_urls[0])}" alt="${attr(g.title)}" loading="lazy" />` : `<div class="thumb-fallback">${esc(g.category_icon || '📖')}</div>`; }
function renderGuides() { const grid = $('guideGrid'); $('resultTitle').textContent = state.q ? 'Search Results' : state.category ? 'Topic Guides' : content('guides_title', 'Official Guides'); if (state.guidesLoading) { grid.innerHTML = skeletons(3, 'guide'); return; } if (state.guidesError) { grid.innerHTML = stateBlock({ icon:'⚠️', variant:'error', title:'Connection issue', message:'Cannot reach the help API. Please try again.', action:'<button type="button" data-retry="guides">Retry</button>' }); grid.querySelector('[data-retry="guides"]')?.addEventListener('click', loadGuides); return; } if (!state.guides.length) { grid.innerHTML = stateBlock({ icon: state.q ? '🔎' : '📖', title: state.q ? 'No results' : content('guide_empty_title', 'No guides yet'), message: state.q ? `No guides match “${state.q}”.` : content('guide_empty_message', 'Guide images will appear here after admin publishes them.'), action: state.q ? '<button type="button" data-retry="clear">Clear search</button>' : '' }); grid.querySelector('[data-retry="clear"]')?.addEventListener('click', clearSearch); return; } grid.innerHTML = state.guides.map(g => `<article class="guide-card" data-slug="${attr(g.slug)}" role="button" tabindex="0"><div class="guide-thumb">${guideThumb(g)}</div><div class="guide-info"><span class="badge">${esc(g.category_name || 'Guide')}</span><h3>${esc(g.title)}</h3><p>${esc(g.summary || 'Tap to view step-by-step guide.')}</p><small>${g.image_urls?.length || 0} guide image(s)</small></div></article>`).join(''); document.querySelectorAll('.guide-card').forEach(card => { const open = () => openGuide(card.dataset.slug); card.addEventListener('click', open); card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); }); }
function renderFaqFilter() { $('faqFilter').innerHTML = ''; }
function renderFaqs() { const list = $('faqList'); if (state.faqsLoading) { list.innerHTML = skeletons(4, 'faq'); return; } if (state.faqsError) { list.innerHTML = stateBlock({ icon:'⚠️', variant:'error', title:'Cannot load FAQ', message:'The FAQ service is unreachable right now.', action:'<button type="button" data-retry="faqs">Retry</button>' }); list.querySelector('[data-retry="faqs"]')?.addEventListener('click', loadFaqs); return; } if (!state.faqs.length) { list.innerHTML = stateBlock({ icon:'💬', title:'No questions yet', message:'FAQ answers will appear here once added.' }); return; } list.innerHTML = state.faqs.map((f,i) => `<details class="faq" ${i===0?'open':''}><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join(''); }
async function loadGuideContent() { try { const data = await api('/guide/content'); state.settings = data.settings || {}; state.content = data.content || {}; state.sections = Object.fromEntries((data.home_sections || []).map(s => [s.section_key, !!s.enabled])); state.cards = data.popular_help || []; state.nav = data.navigation || []; state.quick = data.quick_replies || []; } catch (err) { console.warn('Guide content fallback', err); try { state.settings = await api('/settings'); } catch (_) {} } renderDynamicContent(); renderPopularHelp(); renderQuickChips(); renderBottomNav(); }
async function loadCategories() { try { state.categories = await api('/categories'); } catch (_) { state.categories = []; } renderCategories(); }
async function loadGuides() { state.guidesLoading = true; state.guidesError = null; renderGuides(); try { const params = new URLSearchParams(); if (state.q) params.set('q', state.q); if (state.category) params.set('category', state.category); state.guides = await api(`/guides?${params.toString()}`); } catch (err) { console.error(err); state.guidesError = err; state.guides = []; } finally { state.guidesLoading = false; renderGuides(); } }
async function loadFaqs() { state.faqsLoading = true; state.faqsError = null; renderFaqs(); try { state.faqs = await api('/faqs'); } catch (err) { console.error(err); state.faqsError = err; state.faqs = []; } finally { state.faqsLoading = false; renderFaqFilter(); renderFaqs(); } }
async function openGuide(slug) { const dialog = $('guideDialog'); $('guideArticle').innerHTML = `<div style="padding:32px">${skeletons(1, 'guide')}</div>`; dialog.showModal(); try { const g = await api(`/guides/${slug}`); $('guideArticle').innerHTML = `<div class="article-head"><span class="badge">${esc(g.category_name || 'Guide')}</span><h2>${esc(g.title)}</h2><p>${esc(g.summary || '')}</p></div><div class="article-images">${(g.image_urls || []).map(url => `<img src="${attr(url)}" alt="${attr(g.title)} guide image" />`).join('') || '<div class="no-image">No guide image uploaded yet.</div>'}</div><div class="article-body">${esc(g.body)}</div>`; } catch (err) { $('guideArticle').innerHTML = `<div style="padding:24px">${stateBlock({ icon:'⚠️', variant:'error', title:'Cannot load guide', message:'This guide could not be fetched.' })}</div>`; } }
function searchNow(q) { state.q = (q || $('searchInput').value).trim(); state.category = ''; renderCategories(); loadGuides(); }
function searchBy(q) { $('searchInput').value = q; searchNow(q); $('guidesSection').scrollIntoView({ behavior:'smooth', block:'start' }); }
function clearSearch() { state.q = ''; state.category = ''; $('searchInput').value = ''; renderCategories(); loadGuides(); }
$('searchBtn').addEventListener('click', e => { e.preventDefault(); searchNow(); });
$('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); searchNow(); } });
$('clearBtn').addEventListener('click', clearSearch);
$('closeDialog').addEventListener('click', () => $('guideDialog').close());
state.guidesLoading = true; renderGuides(); state.faqsLoading = true; renderFaqs();
Promise.allSettled([loadGuideContent(), loadCategories(), loadGuides(), loadFaqs()]);
