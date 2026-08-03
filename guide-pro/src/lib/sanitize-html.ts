import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote",
  "pre", "code", "h1", "h2", "h3", "h4", "a", "img", "table", "thead", "tbody",
  "tr", "th", "td", "hr", "span", "div",
];

const ALLOWED_ATTR = [
  "href", "title", "target", "rel", "src", "alt", "width", "height", "colspan", "rowspan",
  "class", "aria-label",
];

/**
 * Last-mile browser sanitization for administrator-authored rich content.
 * The API also sanitizes on write and read; this protects old rows and cached
 * responses while they are being migrated.
 */
export function sanitizeRichHtml(value: string | null | undefined): string {
  return DOMPurify.sanitize(String(value || ""), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "svg", "math"],
    FORBID_ATTR: ["srcset"],
  });
}
