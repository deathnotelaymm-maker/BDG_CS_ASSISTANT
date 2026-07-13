import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, MessageSquare, Languages } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PUBLIC_LANGUAGES, getPublicLanguage, type PublicLanguage } from "@/lib/api";
import { useState } from "react";

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
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:max-w-4xl md:pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

function PublicHeader() {
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
          <span
            className="grid h-8 min-w-11 place-items-center rounded-lg px-1.5 font-display text-[11px] font-bold text-[color:var(--bdg-navy-deep)]"
            style={{ background: "var(--gradient-gold)" }}
          >
            BDG
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-display text-sm font-semibold">BDG Help Center</span>
            <span className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
              {language === "hi" ? "आधिकारिक सहायता" : "Official support"}
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
              {PUBLIC_LANGUAGES.map((l) => (
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
