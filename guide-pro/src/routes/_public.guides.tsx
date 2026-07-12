import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Filter, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { api, getPublicLanguage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type GuideSearch = { q?: string; category?: string };

export const Route = createFileRoute("/_public/guides")({
  head: () => ({
    meta: [
      { title: "Guides — BDG Help Center" },
      { name: "description", content: "Browse BDG guides and tutorials for deposits, withdrawals, account and more." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): GuideSearch => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
  }),
  component: Guides,
});

function Guides() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  if (cleanPath !== "/guides") return <Outlet />;
  return <GuidesIndex />;
}

function GuidesIndex() {
  const { q, category } = Route.useSearch();
  const navigate = useNavigate({ from: "/guides" });
  const [text, setText] = useState(q ?? "");
  const lang = getPublicLanguage();
  const copy = lang === "hi" ? { title: "गाइड और ट्यूटोरियल", subtitle: "BDG प्लेटफ़ॉर्म के लिए चरण-दर-चरण सहायता।", search: "गाइड खोजें…", all: "सभी", loading: "गाइड लोड हो रहे हैं…", error: "गाइड सेवा से कनेक्ट नहीं हो सका। आपकी प्रकाशित सामग्री सुरक्षित है।", retry: "फिर कोशिश करें", empty: "कोई परिणाम नहीं मिला। दूसरा keyword आज़माएँ।", updated: "अपडेट" } : { title: "Guides & tutorials", subtitle: "Step-by-step help for the whole BDG platform.", search: "Search guides…", all: "All", loading: "Loading guides…", error: "Unable to connect to the guide service. Your published content is still safe.", retry: "Try again", empty: "No results found. Try a different keyword.", updated: "Updated" };
  useEffect(() => setText(q ?? ""), [q]);

  const cats = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["guides", q, category, lang],
    queryFn: () => api.getGuides({ q, category }),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
      </header>

      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ search: (p: any) => ({ ...p, q: text || undefined }) });
        }}
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={copy.search}
          className="h-11 rounded-xl pl-9 pr-10"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText("");
              navigate({ search: (p: any) => ({ ...p, q: undefined }) });
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <FilterChip active={!category} onClick={() => navigate({ search: (p: any) => ({ ...p, category: undefined }) })}>
          {copy.all}
        </FilterChip>
        {cats.data?.map((c) => (
          <FilterChip
            key={c.id}
            active={category === c.slug}
            onClick={() => navigate({ search: (p: any) => ({ ...p, category: c.slug }) })}
          >
            {c.name}
          </FilterChip>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {copy.loading}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{copy.error}</p>
          <button className="mt-2 text-sm font-medium underline" onClick={() => refetch()}>
            {copy.retry}
          </button>
        </div>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {copy.empty}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((g) => (
          <Link
            key={g.id}
            to="/guides/$slug"
            params={{ slug: g.slug }}
            className="group flex overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
          >
            {g.cover ? (
              <div className="h-28 w-28 shrink-0 overflow-hidden bg-muted">
                <img src={g.cover} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1 p-3">
              <Badge variant="secondary" className="text-[10px] uppercase">{g.category}</Badge>
              <h3 className="mt-1 line-clamp-1 font-display text-sm font-semibold">{g.title}</h3>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{g.summary}</p>
              <div className="mt-2 text-[10px] text-muted-foreground">{copy.updated} {g.updatedAt}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? "border-[color:var(--bdg-navy)] bg-[color:var(--bdg-navy)] text-white"
          : "border-border bg-card text-foreground hover:bg-muted")
      }
    >
      {children}
    </button>
  );
}