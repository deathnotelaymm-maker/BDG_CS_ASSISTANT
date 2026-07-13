import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  HelpCircle,
  FileText,
  Compass,
  History,
  LogOut,
  Search,
  Bell,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/api";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true as boolean },
  { to: "/admin/guides", label: "Guides", icon: BookOpen },
  { to: "/admin/categories", label: "Categories", icon: Layers },
  { to: "/admin/faqs", label: "FAQ", icon: HelpCircle },
  { to: "/admin/site-content", label: "Site content", icon: FileText },
  { to: "/admin/navigation", label: "Navigation", icon: Compass },
  { to: "/admin/versions", label: "Version history", icon: History },
] as const;

export function AdminLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window !== "undefined" && !auth.token && pathname !== "/admin/login") {
      navigate({ to: "/admin/login" });
    }
  }, [pathname, navigate]);

  const crumbs = buildCrumbs(pathname);

  return (
    <div className="flex min-h-screen bg-[oklch(0.97_0.005_250)] font-sans text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg font-display text-sm font-bold text-[color:var(--bdg-navy-deep)]"
            style={{ background: "var(--gradient-gold)" }}
          >
            B
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">BDG Guide CMS</div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
              Admin
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 text-sm">
          {NAV.map((item) => {
            const active =
              "exact" in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--bdg-gold)]" />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => {
              auth.clear();
              navigate({ to: "/admin/login" });
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                {i === crumbs.length - 1 ? (
                  <span className="font-medium text-foreground">{c.label}</span>
                ) : (
                  <Link to={c.href} className="hover:text-foreground">
                    {c.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search…"
                className="h-8 w-56 rounded-md border border-border bg-background pl-8 pr-2 text-sm outline-none focus:border-[color:var(--bdg-navy)]"
              />
            </div>
            <button className="grid h-8 w-8 place-items-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
            </button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--bdg-navy)] text-xs font-semibold text-[color:var(--bdg-gold)]">
              A
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}

function buildCrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [{ label: "Admin", href: "/admin" }];
  let acc = "";
  for (const p of parts.slice(1)) {
    acc += `/${p}`;
    crumbs.push({
      label: p.replace(/-/g, " ").replace(/^./, (m) => m.toUpperCase()),
      href: `/admin${acc}`,
    });
  }
  return crumbs;
}
