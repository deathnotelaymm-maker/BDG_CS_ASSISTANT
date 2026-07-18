// BDG Help Center API client.
// All real API calls should go through this module.
// This version normalizes the v0.7.0 Render API response into the
// Lovable Guide Pro UI shape, so missing CMS fields never crash the UI.

import * as mock from "@/mock/data";

const configuredApiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
export const API_BASE = (
  configuredApiBase || ((import.meta as any).env?.DEV ? "http://localhost:10000" : "")
).replace(/\/$/, "");

const USE_MOCK =
  (import.meta as any).env?.VITE_USE_MOCK === "true" ||
  (import.meta as any).env?.VITE_USE_MOCK === "1";

const TOKEN_KEY = "bdg_admin_token";
export type PublicLanguage = string;
export const PUBLIC_LANGUAGES: { code: PublicLanguage; label: string }[] = [
  { code: "en", label: "English" },
];

// Public Guide must never show Lovable/demo fallback records in production.
// These are neutral copy defaults only; categories/guides/FAQ arrays stay empty
// unless the Render backend returns real admin-published data.
const productionSiteContent: mock.SiteContent = {
  heroEyebrow: "BDG Official Help",
  heroTitle: "How can we help you today?",
  heroSubtitle: "Official guides and tutorials from BDG support.",
  searchPlaceholder: "Search guides…",
  searchButtonText: "Search",
  popularHelpTitle: "Popular help",
  topicsTitle: "Browse by topic",
  featuredGuidesTitle: "Featured guides",
  faqTitle: "Frequently asked questions",
  supportCtaTitle: "Still need help?",
  supportCtaSubtitle: "Please contact official support.",
  emptyStateText: "No guide has been published yet.",
  errorStateText: "Unable to load guide content from the backend.",
  buttons: {
    contactSupport: "Contact support",
    readGuide: "Read guide",
    viewAll: "View all",
  },
};

const neutralSiteContent: mock.SiteContent = {
  heroEyebrow: "Official support",
  heroTitle: "How can we help you today?",
  heroSubtitle: "Browse approved guides, FAQs, and support information.",
  searchPlaceholder: "Search guides…",
  searchButtonText: "Search",
  popularHelpTitle: "Popular help",
  topicsTitle: "Browse by topic",
  featuredGuidesTitle: "Featured guides",
  faqTitle: "Frequently asked questions",
  supportCtaTitle: "Still need help?",
  supportCtaSubtitle: "Please contact the platform support team.",
  emptyStateText: "No guide has been published for this platform yet.",
  errorStateText: "Unable to load this platform's guide content.",
  buttons: {
    contactSupport: "Contact support",
    readGuide: "Read guide",
    viewAll: "View all",
  },
};

const emptyCategories: mock.Category[] = [];
const emptyGuides: mock.Guide[] = [];
const emptyFaqs: mock.Faq[] = [];
const emptyPopularHelp: mock.PopularHelp[] = [];
export function getPublicLanguage(): PublicLanguage {
  if (typeof window === "undefined") return "en";
  return (window.localStorage.getItem("bdg_public_language") as PublicLanguage) || "en";
}
export function getPublicPlatformKey(): string {
  if (typeof window === "undefined") return "default";
  const fromQuery = new URLSearchParams(window.location.search).get("platform");
  const fromPath = window.location.pathname.match(/^\/p\/([a-z0-9-]+)(?:\/|$)/i)?.[1];
  return String(fromQuery || fromPath || "default").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "default";
}
export function getPlatformCacheKey(): string {
  return getPublicPlatformKey();
}
export interface PublicTheme {
  brand_name?: string;
  brand_tagline?: string;
  logo_text?: string;
  app_name?: string;
  guide_logo_url?: string;
  guide_favicon_url?: string;
  accent_color?: string;
  surface_color?: string;
  support_link?: string;
  support_enabled?: boolean;
  guide_background_url?: string;
  guide_hero_background_url?: string;
  guide_hero_overlay_color?: string;
  guide_font_family?: string;
  guide_surface_color?: string;
  guide_text_color?: string;
  guide_card_radius?: number;
  guide_content_width?: number;
}
function platformLabel(key = getPublicPlatformKey()): string {
  if (!key || key === "default") return "BDG Help Center";
  return "Platform Help Center";
}
function siteContentDefaults(): mock.SiteContent {
  return getPublicPlatformKey() === "default" ? productionSiteContent : neutralSiteContent;
}
export function getPublicBasePath(): string {
  if (typeof window === "undefined") return "";
  const routeKey = window.location.pathname.match(/^\/p\/([a-z0-9-]+)(?:\/|$)/i)?.[1];
  return routeKey ? `/p/${routeKey}` : "";
}
function withLanguage(path: string) {
  const lang = getPublicLanguage();
  const sep = path.includes("?") ? "&" : "?";
  const platform = getPublicPlatformKey();
  return `${path}${sep}language=${encodeURIComponent(lang)}&platform=${encodeURIComponent(platform)}`;
}

export const auth = {
  get token(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

type ReqInit = RequestInit & { admin?: boolean };

async function request<T>(path: string, init: ReqInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (init.admin && auth.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }

  if (!API_BASE)
    throw new Error(
      "Guide API is not configured. Set VITE_API_BASE during the Cloudflare Pages build.",
    );
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  const signal = init.signal ?? controller.signal;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal,
      ...(path.startsWith("/guide/content") ? { cache: "no-store" as RequestCache } : {}),
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError")
      throw new Error("Guide service timed out. Please try again.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  if (res.status === 401 && init.admin) {
    auth.clear();
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const error = new Error(`API ${res.status} ${res.statusText}`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return (await res.json()) as T;
}

async function safe<T>(path: string, init: ReqInit, fallback: () => T): Promise<T> {
  if (USE_MOCK) return fallback();
  try {
    return await request<T>(path, init);
  } catch (e) {
    console.warn(`[api] ${path} failed, using admin fallback`, e);
    return fallback();
  }
}

async function publicSafe<T>(path: string, fallback: () => T): Promise<T> {
  if (USE_MOCK) return fallback();
  try {
    return await request<T>(path, {});
  } catch (e) {
    console.error(`[public-api] ${path} failed`, e);
    throw e;
  }
}

const defaultButtons = {
  contactSupport: "Contact support",
  readGuide: "Read guide",
  viewAll: "View all",
};

const text = (value: unknown, fallback: string) => {
  const v = typeof value === "string" ? value.trim() : "";
  return v || fallback;
};

function iconName(icon: unknown, fallback = "HelpCircle") {
  const raw = String(icon || "").trim();
  if (/^[A-Za-z][A-Za-z0-9]*$/.test(raw)) return raw;
  if (["💰", "💵", "💸"].includes(raw)) return "Wallet";
  if (["💳", "🏦", "💼"].includes(raw)) return "CreditCard";
  if (["👤", "🙋", "🔐"].includes(raw)) return "UserRound";
  if (["🎁", "🎯"].includes(raw)) return "Gift";
  if (["📖", "📚"].includes(raw)) return "BookOpen";
  return fallback;
}

function normalizeSiteContent(raw: any): mock.SiteContent {
  const defaults = siteContentDefaults();
  if (!raw) return defaults;

  // If the API already returns the Guide Pro shape, only merge missing nested values.
  if (raw.heroTitle || raw.heroSubtitle || raw.searchPlaceholder) {
    const guideTheme = raw.guide_theme || {};
    return {
      ...defaults,
      ...raw,
      buttons: { ...defaultButtons, ...(raw.buttons || {}) },
      heroBackgroundUrl: text(raw.heroBackgroundUrl || guideTheme.hero_background_url, ""),
      heroOverlayColor: text(raw.heroOverlayColor || guideTheme.hero_overlay_color, "#081525cc"),
    };
  }

  // Worker v0.5 returns { settings, content, blocks, popular_help, navigation }.
  const c = raw.content || {};
  const settings = raw.settings || {};
  const guideTheme = raw.guide_theme || settings;
  return {
    ...defaults,
    heroEyebrow: text(c.hero_eyebrow, defaults.heroEyebrow),
    heroTitle: text(c.hero_title, settings.banner_title || defaults.heroTitle),
    heroSubtitle: text(
      c.hero_subtitle,
      settings.banner_subtitle || defaults.heroSubtitle,
    ),
    searchPlaceholder: text(c.search_placeholder, defaults.searchPlaceholder),
    searchButtonText: text(c.search_button_text, defaults.searchButtonText),
    popularHelpTitle: text(c.popular_title, defaults.popularHelpTitle),
    topicsTitle: text(c.topics_title, defaults.topicsTitle),
    featuredGuidesTitle: text(c.guides_title, defaults.featuredGuidesTitle),
    faqTitle: text(c.faq_title, defaults.faqTitle),
    supportCtaTitle: text(c.support_cta_title, defaults.supportCtaTitle),
    supportCtaSubtitle: text(
      c.support_cta_subtitle,
      c.footer_note || defaults.supportCtaSubtitle,
    ),
    emptyStateText: text(c.guide_empty_message, defaults.emptyStateText),
    errorStateText: text(c.error_state_text, defaults.errorStateText),
    buttons: {
      contactSupport: text(c.support_button_text, defaultButtons.contactSupport),
      readGuide: text(c.read_guide_text, defaultButtons.readGuide),
      viewAll: text(c.view_all_text, defaultButtons.viewAll),
    },
    heroBackgroundUrl: text(guideTheme.hero_background_url, ""),
    heroOverlayColor: text(guideTheme.hero_overlay_color, "#081525cc"),
  };
}

function normalizeCategory(row: any): mock.Category {
  return {
    id: String(row?.id ?? row?.slug ?? Math.random()),
    slug: text(row?.slug, text(row?.name, "category").toLowerCase().replace(/\s+/g, "-")),
    name: text(row?.name, "Category"),
    icon: iconName(row?.icon),
    iconUrl: text(row?.icon_url, ""),
    description: text(row?.description, ""),
  };
}

function normalizeFaq(row: any): mock.Faq {
  return {
    id: String(row?.id ?? row?.question ?? Math.random()),
    question: text(row?.question, "Question"),
    answer: text(row?.answer, ""),
    category: row?.category || row?.category_slug || undefined,
  };
}

function bodyToBlocks(body: unknown, imageUrls: string[] = []): mock.GuideBlock[] {
  const blocks: mock.GuideBlock[] = [];
  const lines = String(body || "")
    .replace(/\\n/g, "\n")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  let step = 0;
  for (const line of lines) {
    const clean = line.replace(/^[•*-]\s+/, "").trim();
    const numbered = clean.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) {
      step += 1;
      blocks.push({ type: "step", title: `Step ${step}`, text: numbered[2].trim() });
      continue;
    }
    if (/^Q[:：]/i.test(clean)) {
      blocks.push({ type: "heading", level: 3, text: clean.replace(/^Q[:：]\s*/i, "Q: ") });
      continue;
    }
    if (/^A[:：]/i.test(clean)) {
      blocks.push({ type: "note", text: clean.replace(/^A[:：]\s*/i, "") });
      continue;
    }
    if (/^(important|note)[:：]/i.test(clean)) {
      blocks.push({ type: "note", text: clean });
      continue;
    }
    if (/^warning[:：]/i.test(clean)) {
      blocks.push({ type: "warning", text: clean });
      continue;
    }
    const letters = clean.replace(/[^A-Za-z]/g, "");
    if (clean.length <= 70 && letters.length >= 4 && clean === clean.toUpperCase()) {
      blocks.push({ type: "heading", level: 2, text: clean });
      continue;
    }
    blocks.push({ type: "paragraph", text: clean });
  }

  for (const url of imageUrls.filter(Boolean)) {
    blocks.push({ type: "image", url, alt: "Guide screenshot", caption: "Guide screenshot" });
  }
  return blocks.length
    ? blocks
    : [{ type: "paragraph", text: "Guide details will be updated soon." }];
}

function normalizeGuide(row: any): mock.Guide {
  const lang = getPublicLanguage();
  const tr = row?.translations?.[lang] || null;
  const imgs =
    Array.isArray(tr?.image_urls) && tr.image_urls.length
      ? tr.image_urls
      : Array.isArray(row?.image_urls)
        ? row.image_urls
        : Array.isArray(row?.images)
          ? row.images
          : row?.image_url
            ? [row.image_url]
            : [];
  const title = text(tr?.title || row?.title, "Guide");
  const slug = text(
    row?.slug,
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  );
  const bodyHtml = tr?.body_html || row?.body_html || "";
  const bodyText = tr?.body || row?.body || row?.content || bodyHtml || "";
  return {
    id: String(row?.id ?? slug),
    slug,
    title,
    summary: text(
      tr?.summary || row?.summary || row?.short_answer || row?.description,
      "Step-by-step official guide.",
    ),
    category: text(row?.category || row?.category_name || row?.category_slug, "Guide"),
    cover: text(
      tr?.cover_image_url || row?.cover || row?.cover_image_url || row?.thumbnail || imgs[0],
      "",
    ),
    updatedAt: text(row?.updatedAt || row?.updated_at || row?.created_at, ""),
    status: row?.status === "draft" || row?.status === "archived" ? row.status : "published",
    priority: Number(row?.priority ?? row?.sort_order ?? 100),
    views: Number(row?.views ?? 0),
    keywords: Array.isArray(row?.keywords)
      ? row.keywords
      : String(row?.keywords || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
    supportCta: false,
    richDocument: row?.rich_document?.type === "doc" ? row.rich_document : null,
    actionButtons: Array.isArray(row?.action_buttons) ? row.action_buttons : [],
    blocks:
      Array.isArray(row?.blocks) && row.blocks.length ? row.blocks : bodyToBlocks(bodyText, imgs),
    relatedGuides: row?.relatedGuides || [],
    relatedFaqs: row?.relatedFaqs || [],
  };
}

function normalizePopular(row: any): mock.PopularHelp {
  const linked = text(row?.linked_category_slug || row?.category_slug, "");
  const query = text(row?.query, row?.title || "");
  const href =
    row?.link ||
    row?.href ||
    (linked
      ? `/guides?category=${encodeURIComponent(linked)}`
      : `/guides?q=${encodeURIComponent(query)}`);
  return {
    id: String(row?.id ?? row?.title ?? Math.random()),
    title: text(row?.title, "Help"),
    subtitle: text(row?.subtitle || row?.description, ""),
    icon: iconName(row?.icon, "LifeBuoy"),
    link: href,
    sort: Number(row?.sort ?? row?.sort_order ?? 100),
    active:
      row?.active === true ||
      row?.status === "active" ||
      row?.status === "published" ||
      row?.status == null,
  };
}

function normalizePopularList(raw: any): mock.PopularHelp[] {
  const list = Array.isArray(raw) ? raw : raw?.popular_help || raw?.items || [];
  return (list.length ? list : emptyPopularHelp).map(normalizePopular);
}

async function getGuideContentRaw() {
  return publicSafe<any>(withLanguage("/guide/content"), () => ({ content: {}, popular_help: [] }));
}

// ---------- Public endpoints ----------
export const api = {
  getPlatformLanguages: async () => {
    const raw = await getGuideContentRaw();
    return Array.isArray(raw?.public_languages) && raw.public_languages.length ? raw.public_languages : PUBLIC_LANGUAGES;
  },
  getSettings: (): Promise<PublicTheme> =>
    publicSafe<PublicTheme>(withLanguage("/settings"), () => {
      const key = getPublicPlatformKey();
      const name = platformLabel(key);
      return {
        brand_name: key === "default" ? "BDG Help Center" : name,
        brand_tagline: key === "default" ? "Official Support" : `${name} Support`,
        logo_text: key === "default" ? "BDG" : name,
        app_name: key === "default" ? "BDG Help Center" : name,
        guide_logo_url: "",
        guide_favicon_url: "",
        support_link: "/support",
        support_enabled: false,
      };
    }),
  getSiteContent: async () => normalizeSiteContent(await getGuideContentRaw()),
  getCategories: async () =>
    (await publicSafe<any[]>(withLanguage("/categories"), () => emptyCategories)).map(normalizeCategory),
  getFaqs: async () =>
    (await publicSafe<any[]>(withLanguage("/faqs"), () => emptyFaqs)).map(normalizeFaq),
  getGuides: async (params?: { category?: string; q?: string }) => {
    const usp = new URLSearchParams();
    if (params?.category) usp.set("category", params.category);
    if (params?.q) usp.set("q", params.q);
    usp.set("language", getPublicLanguage());
    usp.set("platform", getPublicPlatformKey());
    const query = "?" + usp.toString();
    const rows = await publicSafe<any[]>("/guides" + query, () => emptyGuides);
    return rows.map(normalizeGuide);
  },
  getGuide: async (slugOrId: string) => {
    const row = await publicSafe<any | null>(
      withLanguage(`/guides/${encodeURIComponent(slugOrId)}`),
      () => null,
    );
    return row ? normalizeGuide(row) : null;
  },
  getPopularHelp: async () => [],
};

// ---------- Admin endpoints ----------
export const adminApi = {
  login: async (email: string, password: string) => {
    const result = await safe<any>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      () => ({
        access_token: "mock-admin-token",
        token: "mock-admin-token",
        user: { email, name: "Admin" },
      }),
    );
    return {
      token: result.token || result.access_token,
      user: result.user || { email, name: "Admin" },
    };
  },

  getSiteContent: () => safe("/admin/site-content", { admin: true }, () => mock.siteContent),
  updateSiteContent: (data: unknown) =>
    safe("/admin/site-content", { admin: true, method: "PUT", body: JSON.stringify(data) }, () => ({
      ok: true,
    })),

  getPopularHelp: () => safe("/admin/popular-help", { admin: true }, () => mock.popularHelp),
  createPopularHelp: (data: unknown) =>
    safe(
      "/admin/popular-help",
      { admin: true, method: "POST", body: JSON.stringify(data) },
      () => ({ ok: true }),
    ),
  updatePopularHelp: (id: string, data: unknown) =>
    safe(
      `/admin/popular-help/${id}`,
      { admin: true, method: "PUT", body: JSON.stringify(data) },
      () => ({ ok: true }),
    ),
  deletePopularHelp: (id: string) =>
    safe(`/admin/popular-help/${id}`, { admin: true, method: "DELETE" }, () => ({ ok: true })),

  getGuides: () => safe("/admin/guides", { admin: true }, () => mock.guides),
  createGuide: (data: unknown) =>
    safe("/admin/guides", { admin: true, method: "POST", body: JSON.stringify(data) }, () => ({
      ok: true,
      id: `g_${Date.now()}`,
    })),
  updateGuide: (id: string, data: unknown) =>
    safe(`/admin/guides/${id}`, { admin: true, method: "PUT", body: JSON.stringify(data) }, () => ({
      ok: true,
    })),
  deleteGuide: (id: string) =>
    safe(`/admin/guides/${id}`, { admin: true, method: "DELETE" }, () => ({ ok: true })),

  upload: (file: File) => {
    if (USE_MOCK) return Promise.resolve({ url: URL.createObjectURL(file) });
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/admin/uploads`, {
      method: "POST",
      body: fd,
      headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : undefined,
    }).then((r) => r.json() as Promise<{ url: string }>);
  },
};

export type {};
