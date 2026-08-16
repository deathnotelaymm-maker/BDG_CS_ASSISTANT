export type CommerceContextSession = {
  version: 2;
  context: string;
  context_id?: string;
  expires_at: number;
  customer?: { id?: string; customer_code?: string };
  store?: { id?: string; name?: string };
  current_order_ref?: string | null;
  page_path?: string | null;
  platform_route_key?: string | null;
  parent_origin?: string;
};

const PREFIX = "luke_commerce_context_v2";
function key(platformKey: string) { return `${PREFIX}:${platformKey}`; }
function normalized(value: string) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-"); }
function referrerOrigin() {
  try { const u = new URL(document.referrer); return u.protocol === "https:" ? u.origin : ""; } catch { return ""; }
}
export function getCommerceContext(platformKey: string): CommerceContextSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key(platformKey)) || "null") as CommerceContextSession | null;
    if (!value?.context || value.version !== 2 || value.context.length > 12000 || value.expires_at <= Date.now() + 5000) return null;
    return value;
  } catch { return null; }
}
export function requestCommerceContextRefresh() {
  if (typeof window === "undefined" || window.parent === window) return;
  const origin = referrerOrigin();
  window.parent.postMessage({ type: "LUKE_COMMERCE_CONTEXT_REQUEST", version: 2 }, origin || "*");
}
export function installCommerceContextBridge(platformKey: string, onChange: (value: CommerceContextSession | null) => void) {
  if (typeof window === "undefined") return () => {};
  const parentOrigin = referrerOrigin();
  onChange(getCommerceContext(platformKey));
  const handler = (event: MessageEvent) => {
    if (window.parent === window || event.source !== window.parent) return;
    if (parentOrigin && event.origin !== parentOrigin) return;
    const data = event.data || {};
    if (data.type !== "LUKE_COMMERCE_CONTEXT" || Number(data.version) !== 2) return;
    const token = String(data.context || "").trim();
    if (!token.startsWith("eyJ") || token.length < 80 || token.length > 12000) return;
    const route = normalized(String(data.platform_route_key || ""));
    if (route && route !== normalized(platformKey)) return;
    const expires = Math.max(30, Math.min(900, Number(data.expires_in || 300)));
    const value: CommerceContextSession = {
      version: 2,
      context: token,
      context_id: String(data.context_id || ""),
      expires_at: Date.now() + expires * 1000,
      customer: data.customer && typeof data.customer === "object" ? { id: String(data.customer.id || ""), customer_code: String(data.customer.customer_code || "") } : undefined,
      store: data.store && typeof data.store === "object" ? { id: String(data.store.id || ""), name: String(data.store.name || "") } : undefined,
      current_order_ref: data.current_order_ref ? String(data.current_order_ref).slice(0,160) : null,
      page_path: data.page_path ? String(data.page_path).slice(0,500) : null,
      platform_route_key: route || null,
      parent_origin: event.origin,
    };
    window.sessionStorage.setItem(key(platformKey), JSON.stringify(value));
    onChange(value);
  };
  window.addEventListener("message", handler);
  requestCommerceContextRefresh();
  return () => window.removeEventListener("message", handler);
}
