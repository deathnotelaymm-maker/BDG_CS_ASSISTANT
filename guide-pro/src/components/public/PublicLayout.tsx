import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, BookOpen, MessageSquare, Languages } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { api, PUBLIC_LANGUAGES, getPlatformCacheKey, getPublicLanguage, type PublicLanguage } from "@/lib/api";
import { useState } from "react";
import { useEffect } from "react";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/guides", label: "Guides", icon: BookOpen },
  { to: "/faq", label: "FAQ", icon: MessageSquare },
] as const;

function navLabel(label: string, lang: PublicLanguage) {
  if (lang !== "hi") return label;
  return ({ Home: "होम", Guides: "गाइड", FAQ: "FAQ" } as Record<string, string>)[label] || label;
}

export function PublicLayout({ children }: { children: ReactNode }) {
  const platformKey = getPlatformCacheKey();
  const { data: theme } = useQuery({
    queryKey: ["platform-theme", platformKey],
    queryFn: api.getSettings,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: platformLanguages } = useQuery({
    queryKey: ["platform-languages", platformKey],
    queryFn: api.getPlatformLanguages,
    staleTime: 30_000,
  });
  const platformName = theme?.brand_name || theme?.app_name || (platformKey === "default" ? "BDG Help Center" : "Platform Help Center");
  const platformTagline = theme?.brand_tagline || (platformKey === "default" ? "Official Support" : `${platformName} Support`);
  const guideStyle = {
    ...(theme?.guide_background_url ? { backgroundImage: `url(${theme.guide_background_url})`, backgroundSize: "cover", backgroundAttachment: "fixed" } : {}),
    ...(theme?.guide_font_family && /^[A-Za-z0-9 ,'-]{1,120}$/.test(theme.guide_font_family) ? { fontFamily: theme.guide_font_family } : {}),
    ...(theme?.guide_text_color ? { color: theme.guide_text_color } : {}),
    ...(theme?.guide_surface_color ? { ["--card" as string]: theme.guide_surface_color } : {}),
    ...(theme?.guide_card_radius ? { ["--radius" as string]: `${Math.max(8, Math.min(32, theme.guide_card_radius))}px` } : {}),
  } as CSSProperties;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = `${platformName} — Guides, FAQ & Support`;
    document.querySelectorAll('link[data-platform-default-favicon="true"]').forEach((link) => {
      if (platformKey !== "default") link.remove();
    });
    const favicon = theme?.guide_favicon_url;
    const existing = document.querySelector<HTMLLinkElement>('link[data-platform-favicon="true"]');
    if (favicon) {
      const link = existing || document.createElement("link");
      link.rel = "icon";
      link.setAttribute("data-platform-favicon", "true");
      link.href = favicon;
      if (!existing) document.head.appendChild(link);
    } else if (existing) {
      existing.remove();
    }
  }, [platformKey, platformName, theme?.guide_favicon_url]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" style={guideStyle}>
      <PublicHeader platformKey={platformKey} platformName={platformName} platformTagline={platformTagline} logoUrl={theme?.guide_logo_url || ""} languages={platformLanguages || PUBLIC_LANGUAGES} />
      <main className="mx-auto w-full px-4 pb-28 pt-4 md:pb-16" style={{ maxWidth: `${Math.max(720, Math.min(1400, Number(theme?.guide_content_width || 960)))}px` }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

function PublicHeader({ platformKey, platformName, platformTagline, logoUrl, languages }: { platformKey: string; platformName: string; platformTagline: string; logoUrl: string; languages: { code: string; label: string }[] }) {
  const [language, setLanguage] = useState<PublicLanguage>(() => getPublicLanguage());
  const changeLanguage = (next: PublicLanguage) => {
    setLanguage(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("bdg_public_language", next);
      window.location.reload();
    }
  };
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-2 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={`${platformName} logo`} className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <span
              className="grid h-8 min-w-11 place-items-center rounded-lg px-1.5 font-display text-[11px] font-bold text-[color:var(--bdg-navy-deep)]"
              style={{ background: "var(--gradient-gold)" }}
              title={platformKey === "default" ? "BDG" : "Logo not configured"}
            >
              {platformKey === "default" ? "BDG" : "?"}
            </span>
          )}
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-display text-sm font-semibold">{platformName}</span>
            <span className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
              {language === "hi" ? "आधिकारिक सहायता" : platformTagline}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 text-xs text-muted-foreground shadow-sm">
            <Languages className="h-3.5 w-3.5" />
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value as PublicLanguage)}
              className="bg-transparent text-foreground outline-none"
              aria-label="Language"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lang = getPublicLanguage();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-[color:var(--bdg-navy)]" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-[color:var(--bdg-gold-deep)]")} />
              {navLabel(label, lang)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
