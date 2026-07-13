// Live API client for BDG Help Center Business Admin.
// This file wires the Lovable admin UI to the existing Cloudflare Worker API.

import { mock } from "@/mock/data";

const configuredApiBase =
  typeof import.meta !== "undefined"
    ? ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)
    : undefined;
export const API_BASE_URL = (
  configuredApiBase || ((import.meta as any).env?.DEV ? "http://localhost:10000" : "")
).replace(/\/$/, "");

export const MOCK_MODE =
  ((typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_MOCK_MODE) || "false") ===
  "true";

const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_user";

function getToken() {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem("bdg_token") || "";
}

export function logout() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("bdg_token");
  localStorage.removeItem(USER_KEY);
}

export function getCurrentUser() {
  if (typeof localStorage === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  if (!API_BASE_URL)
    throw new Error(
      "Admin API is not configured. Set VITE_API_BASE_URL during the Cloudflare Pages build.",
    );
  const timeoutSignal = AbortSignal.timeout(20000);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    signal,
  });

  if (res.status === 401) {
    logout();
    throw new Error("Unauthorized. Please login again.");
  }

  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const msg = payload?.error || payload?.message || res.statusText || "API request failed";
    throw new Error(`API ${res.status}: ${msg}`);
  }

  return payload as T;
}

function delay<T>(v: T, ms = 350): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), ms));
}

const resourcePath: Record<string, string> = {
  "site-content": "/admin/site-content",
  "help-cards": "/admin/popular-help",
  "popular-help": "/admin/popular-help",
  categories: "/admin/categories",
  "guide-images": "/admin/guides",
  guides: "/admin/guides",
  faq: "/admin/faqs",
  faqs: "/admin/faqs",
  "ai-knowledge": "/admin/knowledge",
  knowledge: "/admin/knowledge",
  "prompt-history": "/admin/ai/prompt-versions",
  "chat-quick-replies": "/admin/chat-quick-replies",
  "ai-content": "/admin/ai-content",
  "chat-logs": "/admin/chat-logs",
  "unmatched-questions": "/admin/unmatched-questions",
  "audit-logs": "/admin/audit-logs",
  "admin-users": "/admin/admin-users",
  "foundation-diagnostics": "/admin/foundation-diagnostics",
  "ai-prompts": "/admin/ai/prompts",
};

function normalizeResourcePayload(resource: string, payload: any): any[] {
  if (resource === "admin-users") {
    const arr = Array.isArray(payload) ? payload : [];
    return arr.map((u: any) => ({
      id: u.id,
      name: u.name || (u.email || "").split("@")[0],
      email: u.email,
      role: String(u.role || "admin").toLowerCase(),
      status: u.status || (u.is_active === false ? "inactive" : "active"),
      twofa_enabled: u.twofa_enabled === true,
      session_version: u.session_version || 0,
      lastLogin: u.lastLogin || u.last_login_at || "",
      created_at: u.created_at || "",
    }));
  }

  if (Array.isArray(payload)) return payload;

  if (resource === "site-content") {
    return (payload?.blocks || []).map((b: any) => ({
      // The API updates content by immutable block_key, never by the numeric DB id.
      id: b.block_key,
      database_id: b.id,
      key: b.block_key || b.key,
      block_key: b.block_key || b.key,
      label: b.label || b.block_key,
      value: b.value || "",
      input_type: b.input_type || "text",
      sort_order: b.sort_order ?? 100,
      updatedAt: b.updated_at || "",
      status: "active",
    }));
  }

  if (resource === "chat-logs") {
    const arr = Array.isArray(payload) ? payload : [];
    return arr.map((log: any) => ({
      ...log,
      customer_message: log.customer_message || "",
      assistant_reply: log.assistant_reply || "",
      matched_sources: Array.isArray(log.matched_sources) ? log.matched_sources : [],
      matched_images: Array.isArray(log.matched_images) ? log.matched_images : [],
      uploaded_images: Array.isArray(log.uploaded_images) ? log.uploaded_images : [],
      provider_status: log.provider_status || (log.used_deepseek ? "success" : "fallback"),
      error_type: log.error_type || "",
      latency_ms: Number(log.latency_ms || 0),
      request_id: log.request_id || "",
      response_blocks: Array.isArray(log.response_blocks) ? log.response_blocks : [],
      response_format: log.response_format || "text",
      resolution_state: log.resolution_state || "open",
    }));
  }

  return [];
}

function normalizeForCreate(resource: string, data: any) {
  if (resource === "admin-users") {
    return {
      name: data.name || "Admin",
      email: data.email,
      password: data.password || data.new_password || undefined,
      role: String(data.role || "admin")
        .toLowerCase()
        .includes("owner")
        ? "admin"
        : String(data.role || "admin").toLowerCase(),
      status: data.status || "active",
      is_active: data.status !== "inactive",
    };
  }
  if (resource === "site-content") {
    return {
      block_key: data.block_key || data.key,
      label: data.label || data.key || data.block_key,
      value: data.value || "",
      input_type: data.input_type || "text",
      sort_order: Number(data.sort_order || 100),
    };
  }
  if (resource === "help-cards") {
    return {
      title: data.title,
      subtitle: data.subtitle || "",
      icon: data.icon || "✨",
      query: data.query || data.title || "",
      linked_category_slug: data.linked_category_slug || "",
      sort_order: Number(data.sort_order || data.order || 100),
      status: data.status || "active",
    };
  }
  if (resource === "guide-images" || resource === "guides") {
    return {
      title: data.title || data.title_en || data.filename || "Guide",
      title_hi: data.title_hi || "",
      slug: data.slug,
      summary: data.summary || data.summary_en || "",
      summary_hi: data.summary_hi || "",
      body: data.body || data.body_en || data.summary || "",
      body_hi: data.body_hi || "",
      body_html: data.body_html || "",
      body_blocks_json: data.body_blocks_json || "",
      body_blocks_json_hi: data.body_blocks_json_hi || "",
      cover_image_url: data.cover_image_url || data.cover || data.image_url || "",
      cover_image_url_hi: data.cover_image_url_hi || "",
      image_urls: Array.isArray(data.image_urls)
        ? data.image_urls
        : String(data.image_urls || data.image_url || data.cover_image_url || "")
            .split(/\r?\n|,/)
            .map((x) => x.trim())
            .filter(Boolean),
      image_urls_hi: Array.isArray(data.image_urls_hi)
        ? data.image_urls_hi
        : String(data.image_urls_hi || data.cover_image_url_hi || "")
            .split(/\r?\n|,/)
            .map((x) => x.trim())
            .filter(Boolean),
      keywords: data.keywords || "",
      language: data.language || "en",
      priority: Number(data.priority || 100),
      status: data.status || "published",
      category_id: data.category_id || null,
      category_slug: data.category_slug || data.category || "",
    };
  }
  if (resource === "faq") {
    return {
      question: data.question,
      answer: data.answer || data.value || "",
      keywords: data.keywords || "",
      priority: Number(data.priority || 100),
      status: data.status || "published",
    };
  }
  if (resource === "ai-knowledge") {
    return {
      title: data.title,
      content: data.content || data.description || "",
      keywords: data.keywords || "",
      priority: Number(data.priority || 100),
      status: data.status || "active",
    };
  }
  if (resource === "chat-quick-replies") {
    return {
      text: data.text || data.label,
      query: data.query || data.text || data.label,
      sort_order: Number(data.sort_order || data.order || 100),
      status: data.status || "active",
    };
  }
  if (resource === "categories") {
    return {
      name: data.name,
      slug: data.slug,
      description: data.description || "",
      icon: data.icon || "target",
      icon_url: data.icon_url || "",
      sort_order: Number(data.sort_order || 100),
    };
  }
  if (resource === "ai-content") {
    return {
      title: data.title,
      intent_key: data.intent_key,
      locale: data.locale || "en",
      status: data.status || "draft",
      priority: Number(data.priority || 100),
      confidence_threshold: Number(data.confidence_threshold || 86),
      keywords: data.keywords || "",
      positive_examples: data.positive_examples || "",
      negative_examples: data.negative_examples || "",
      required_fields: data.required_fields || "",
      faq_content: data.faq_content || "",
      knowledge_content: data.knowledge_content || "",
      example_answers: data.example_answers || "",
      ai_instruction: data.ai_instruction || "",
      rich_json: data.rich_json || "",
      rich_html: data.rich_html || "",
      image_urls: Array.isArray(data.image_urls)
        ? data.image_urls
        : String(data.image_urls || "")
            .split(/\r?\n|,/)
            .map((x) => x.trim())
            .filter(Boolean),
      image_delivery: data.image_delivery || "after_answer",
      version_label: data.version_label || "v1",
    };
  }
  return data;
}

function pathFor(resource: string, id?: string | number) {
  const base = resourcePath[resource] || `/admin/${resource}`;
  if (resource === "site-content" && id)
    return `/admin/site-content/blocks/${encodeURIComponent(String(id))}`;
  if (id) return `${base}/${id}`;
  return base;
}

function diagnosticsOut(d: any) {
  return {
    ...d,
    deepSeekKeyPresent: !!(d.deepSeekKeyPresent ?? d.deepseek_key_present),
    aiEnabled: !!(d.aiEnabled ?? d.ai_enabled_in_db),
    deepSeekEnabled: !!(d.deepSeekEnabled ?? d.ai_enabled_in_db),
    promptCount: d.promptCount ?? d.counts?.prompts ?? 0,
    faqCount: d.faqCount ?? d.counts?.faqs ?? 0,
    guideCount: d.guideCount ?? d.counts?.guides ?? 0,
    lastApiError: d.lastApiError || "None reported by Worker diagnostics",
    responseTimeMs: d.responseTimeMs ?? 0,
  };
}

export const api = {
  login: async (email: string, password: string, twofa_code?: string) => {
    if (MOCK_MODE)
      return delay({ token: "mock-token", user: { email, name: "Admin", role: "owner" } });
    const res: any = await request(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password, twofa_code }) },
      false,
    );
    if (res?.twofa_required) return { twofa_required: true };
    const token = res.access_token || res.token;
    if (!token) throw new Error("Login succeeded but no token was returned");
    const user = res.user || { email, name: email.split("@")[0], role: "admin" };
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("bdg_token", token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return { token, user };
  },

  getDashboardStats: async () => {
    if (MOCK_MODE) return delay(mock.dashboardStats);
    const [categories, guides, faqs, prompts, aiContent, sessions, audits, health] = await Promise.allSettled([
      api.list("categories"),
      api.list("guide-images"),
      api.list("faq"),
      api.list("ai-prompts"),
      api.list("ai-content"),
      api.list("chat-sessions"),
      api.list("audit-logs"),
      api.getSystemHealth(),
    ]);
    const count = (x: PromiseSettledResult<any>) =>
      x.status === "fulfilled" && Array.isArray(x.value) ? x.value.length : 0;
    return {
      totalGuides: count(guides),
      totalFAQ: count(faqs),
      totalCategories: count(categories),
      aiContentItems: count(aiContent),
      aiPromptSections: count(prompts),
      chatSessions: count(sessions),
      deepSeekStatus:
        health.status === "fulfilled"
          ? health.value?.checks?.find((x: any) => x.name === "deepseek")?.status || "unknown"
          : "unavailable",
      databaseStatus:
        health.status === "fulfilled"
          ? health.value?.checks?.find((x: any) => x.name === "database")?.status || "unknown"
          : "unavailable",
      r2StorageStatus:
        health.status === "fulfilled"
          ? health.value?.checks?.find((x: any) => x.name === "r2")?.status || "unknown"
          : "unavailable",
      recentActivity: (audits.status === "fulfilled" && Array.isArray(audits.value)
        ? audits.value
        : []
      )
        .slice(0, 6)
        .map((a: any) => ({
          id: a.id,
          actor: a.actor || "system",
          action: a.action || a.message || JSON.stringify(a).slice(0, 80),
          time: a.created_at || a.time || "recently",
        })),
    };
  },

  list: async (resource: string) => {
    if (MOCK_MODE) return delay(mock.collections[resource] ?? []);
    if (resource === "ai-prompts") return request("/admin/ai/prompts");
    if (resource === "chat-sessions") return request("/admin/chat-sessions");
    const payload = await request(pathFor(resource));
    return normalizeResourcePayload(resource, payload);
  },

  create: async (resource: string, data: any) => {
    if (MOCK_MODE) return delay({ ...data, id: Date.now() });
    if (resource === "site-content")
      return request(pathFor(resource, data.block_key || data.key), {
        method: "PUT",
        body: JSON.stringify(normalizeForCreate(resource, data)),
      });
    return request(pathFor(resource), {
      method: "POST",
      body: JSON.stringify(normalizeForCreate(resource, data)),
    });
  },

  update: async (resource: string, id: string | number, data: any) => {
    if (MOCK_MODE) return delay({ ...data, id });
    return request(pathFor(resource, id), {
      method: "PUT",
      body: JSON.stringify(normalizeForCreate(resource, data)),
    });
  },

  remove: async (resource: string, id: string | number) => {
    if (MOCK_MODE) return delay({ ok: true });
    if (
      resource === "site-content" ||
      resource === "prompt-history" ||
      resource === "chat-logs" ||
      resource === "audit-logs"
    ) {
      return { ok: true, skipped: true };
    }
    return request(pathFor(resource, id), { method: "DELETE" });
  },

  bulkRemove: async (resource: string, ids: Array<string | number>) => {
    if (MOCK_MODE) return delay({ ok: true, deleted: ids.length });
    const base = resourcePath[resource] || `/admin/${resource}`;
    return request(`${base}/batch-delete`, { method: "POST", body: JSON.stringify({ ids }) });
  },

  deleteAllQuickReplies: async () => {
    if (MOCK_MODE) return delay({ ok: true, deleted: 0 });
    return request("/admin/chat-quick-replies/all", { method: "DELETE" });
  },

  cleanupQuickReplyDuplicates: async () => {
    if (MOCK_MODE) return delay({ ok: true, deleted: 0 });
    return request("/admin/chat-quick-replies/cleanup-duplicates", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  changeAdminPassword: async (id: string | number, password: string) => {
    if (MOCK_MODE) return delay({ ok: true });
    return request(`/admin/admin-users/${id}/password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  getMe: async () => {
    if (MOCK_MODE) return delay({ ok: true, user: getCurrentUser() });
    return request("/admin/me");
  },

  setup2FA: async () => {
    if (MOCK_MODE) return delay({ ok: true, secret: "MOCKSECRET", otpauth_url: "" });
    return request("/admin/me/2fa/setup", { method: "POST", body: JSON.stringify({}) });
  },

  enable2FA: async (code: string) => {
    if (MOCK_MODE) return delay({ ok: true });
    return request("/admin/me/2fa/enable", { method: "POST", body: JSON.stringify({ code }) });
  },

  disable2FA: async (code: string) => {
    if (MOCK_MODE) return delay({ ok: true });
    return request("/admin/me/2fa/disable", { method: "POST", body: JSON.stringify({ code }) });
  },

  forceLogoutAdmin: async (id: string | number) => {
    if (MOCK_MODE) return delay({ ok: true });
    return request(`/admin/admin-users/${id}/force-logout`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  resetAdmin2FA: async (id: string | number) => {
    if (MOCK_MODE) return delay({ ok: true });
    return request(`/admin/admin-users/${id}/reset-2fa`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  getSettings: async () => {
    if (MOCK_MODE)
      return delay({
        app_name: "BDG Help Center",
        logo_text: "BDG",
        support_link: "",
        primary_color: "#3b82f6",
        favicon_url: "",
      });
    return request("/settings", undefined, false);
  },

  updateSettings: async (data: any) => {
    if (MOCK_MODE) return delay(data);
    return request("/admin/settings", { method: "PUT", body: JSON.stringify(data) });
  },

  getSystemHealth: async () => {
    if (MOCK_MODE) return delay({ ok: true, status: "healthy", checks: [] });
    return request("/admin/system-health");
  },

  upload: async (file: File) => {
    if (MOCK_MODE) return delay({ url: URL.createObjectURL(file) });
    const token = getToken();
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE_URL}/admin/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return (await res.json()) as { url: string; filename?: string };
  },

  testAiContent: async (message: string, language = "en") => {
    if (MOCK_MODE)
      return delay({ ok: true, selected_content: null, candidates: [], greeting_bypass: false });
    return request("/admin/ai-content/test", {
      method: "POST",
      body: JSON.stringify({ message, language }),
    });
  },

  generateGuideLayout: async (data: { raw_text: string; language?: string; template?: string }) => {
    if (MOCK_MODE) {
      const lines = data.raw_text
        .split(/\n+/)
        .map((x) => x.trim())
        .filter(Boolean);
      return delay({
        ok: true,
        title: lines[0] || "AI Generated Guide",
        summary: lines.slice(1, 3).join(" ") || "Professional guide draft.",
        slug: (lines[0] || "ai-generated-guide")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        keywords: "guide, support, help",
        blocks: [
          { type: "heading", level: 2, text: lines[0] || "AI Generated Guide" },
          { type: "paragraph", text: lines.slice(1).join("\n") || data.raw_text },
          {
            type: "image",
            url: "",
            alt: "Guide screenshot",
            caption: "Upload related screenshot here",
          },
        ],
      });
    }
    return request("/admin/guides/ai-layout", { method: "POST", body: JSON.stringify(data) });
  },

  copyGuideLayout: async (blocks: any[], target_language = "hi") => {
    if (MOCK_MODE)
      return delay({ ok: true, target_language, blocks: blocks.map((b) => ({ ...b })) });
    return request("/admin/guides/ai-copy-layout", {
      method: "POST",
      body: JSON.stringify({ blocks, target_language }),
    });
  },

  getDiagnostics: async () => {
    if (MOCK_MODE) return delay(mock.diagnostics);
    return diagnosticsOut(await request("/admin/ai/diagnostics"));
  },

  getAdminApiDiagnostics: async () => {
    if (MOCK_MODE) return delay({ ok: true, checks: [] });
    return request("/admin/api-diagnostics");
  },

  getFoundationDiagnostics: async () => {
    if (MOCK_MODE) return delay({ ok: true, checks: [] });
    return request("/admin/foundation-diagnostics");
  },

  testAI: async (message: string) => {
    if (MOCK_MODE)
      return delay({
        reply:
          "Mock reply: this is where the DeepSeek response would appear. Message received: " +
          message,
        latencyMs: 812,
      });
    const started = Date.now();
    const res: any = await request("/admin/ai/test", {
      method: "POST",
      body: JSON.stringify({ message, session_id: "admin-pro-test", image_urls: [] }),
    });
    return { ...res, latencyMs: Date.now() - started };
  },
};
