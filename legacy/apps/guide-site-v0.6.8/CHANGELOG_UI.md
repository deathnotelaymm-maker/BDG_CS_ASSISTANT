# Guide Site — UI Changelog

## Unreleased — Premium redesign

Scope: `guide-site/` only. Backend, API routes, `config.js` behavior, and
local ports are unchanged. No login was added.

### Design
- New dark-luxury theme with gold-gradient accents, tuned to feel like an
  official help center (not a casino lobby).
- Mobile-first, app-shell layout capped at `430px`, framed on larger screens.
- Manrope typeface loaded once from Google Fonts.
- Consolidated tokens in `:root` (palette, radius, shadow, gold gradients),
  removing duplicated color literals.

### Layout
1. **Header** — brand logo + name + "Official Help Center" label with live
   status dot, plus a prominent gold Support button.
2. **Hero + Search** — refined title, gradient border, icon-prefixed search,
   horizontally-scrollable quick chips: Deposit, Withdrawal, Bank Card,
   Login, Promotion.
3. **Popular Help** — new 2×2 gradient card grid with icon + title + short
   description. Cards trigger the corresponding search.
4. **Topics** — existing backend categories rendered as gold-active chips.
5. **Guides** — restyled image cards (thumbnail, category badge, title,
   summary, image count). Keyboard-accessible.
6. **FAQ** — accordion with `+/−` indicator; new **category filter tabs**
   built from `category_name` / `category` on FAQ items (only shown when
   the backend provides them).
7. **Bottom nav** — 4 items (Home, Guides, AI Chat, Support), glass blur,
   safe-area padding, active state highlight.

### States
- **Loading**: shimmer skeletons for guides and FAQ.
- **Empty**: contextual empty cards for "no guides", "no FAQ",
  "no FAQ in category".
- **Search no-result**: dedicated card with a "Clear search" action.
- **Backend error**: red-tinted error card with a Retry button for both
  guides and FAQ; guide dialog also shows an error state when a single
  guide fails.
- Settings failures are silent (defaults render).

### Behavior
- Same `window.APP_CONFIG` contract.
- Same endpoints consumed: `GET /settings`, `/categories`,
  `/guides?q&category`, `/guides/:slug`, `/faqs`.
- Same DOM IDs preserved (`siteName`, `logoText`, `bannerTitle`,
  `bannerSubtitle`, `supportLink`, `bottomSupport`, `chatLink`,
  `bottomChat`, `searchInput`, `searchBtn`, `clearBtn`, `categories`,
  `resultTitle`, `guideGrid`, `faqList`, `guideDialog`, `guideArticle`,
  `closeDialog`) so `app.js` and any admin-side assumptions keep working.
- Backend `primary_color` still overrides the gold accent via
  `--gold` CSS variable.

### Files touched
- `guide-site/index.html` — rewritten markup with new sections.
- `guide-site/styles.css` — full rewrite around a token system.
- `guide-site/app.js` — added state machine (loading/error/empty),
  FAQ category filter, retry actions, dialog loading + error states.
- `guide-site/config.js` — unchanged.
