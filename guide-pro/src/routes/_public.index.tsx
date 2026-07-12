import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ArrowRight, Sparkles, ChevronRight, LifeBuoy } from "lucide-react";
import { api, getPublicLanguage } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CategoryIcon } from "@/components/public/CategoryIcon";
import { ServiceErrorPanel } from "@/components/public/ServiceErrorPanel";

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "BDG Help Center — Guides, FAQ & Support" },
      { name: "description", content: "Official BDG Help Center. Deposits, withdrawals, bank cards, login help and more." },
    ],
  }),
  component: Home,
});

function Home() {
  const content = useQuery({ queryKey: ["site-content"], queryFn: api.getSiteContent });
  const categories = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });
  const guides = useQuery({ queryKey: ["guides"], queryFn: () => api.getGuides() });
  const faqs = useQuery({ queryKey: ["faqs"], queryFn: api.getFaqs });
  const [q, setQ] = useState("");
  const lang = getPublicLanguage();

  const c = content.data;

  return (
    <div className="space-y-10">
      <section
        className="relative overflow-hidden rounded-3xl p-6 pt-8 text-white shadow-[var(--shadow-card)] md:p-10"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-25 blur-3xl" style={{ background: "var(--bdg-gold)" }} />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider">
            <Sparkles className="h-3 w-3" style={{ color: "var(--bdg-gold)" }} />
            BDG Official Help
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight md:text-5xl">
            {c?.heroTitle ?? "How can we help you today?"}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-white/70 md:text-base">
            {c?.heroSubtitle ?? "Guides, tutorials and answers for everything BDG."}
          </p>

          <form
            className="mt-6 flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-lg"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) window.location.href = `/guides?q=${encodeURIComponent(q.trim())}`;
            }}
          >
            <div className="flex flex-1 items-center gap-2 pl-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={c?.searchPlaceholder ?? "Search guides…"}
                className="w-full bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--bdg-navy-deep)] shadow-[var(--shadow-gold)]"
              style={{ background: "var(--gradient-gold)" }}
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {content.isError && (
        <ServiceErrorPanel compact language={lang} onRetry={() => void content.refetch()} />
      )}

      <section>
        <SectionHeader title={c?.topicsTitle ?? "Browse by topic"} />
        {categories.isError ? (
          <div className="mt-3"><ServiceErrorPanel compact language={lang} onRetry={() => void categories.refetch()} /></div>
        ) : categories.data && categories.data.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
            {categories.data.map((cat) => (
              <Link
                key={cat.id}
                to="/guides"
                search={{ category: cat.slug }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--bdg-navy)] text-[color:var(--bdg-gold)]">
                  <CategoryIcon name={cat.icon} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{cat.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{cat.description || "Official topic"}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            No backend categories published yet. Create categories in Admin to show them here.
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title={c?.featuredGuidesTitle ?? "Featured guides"}
          action={
            <Link to="/guides" className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--bdg-navy)] hover:underline">
              {c?.buttons.viewAll ?? "View all"} <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        {guides.isError ? (
          <div className="mt-3"><ServiceErrorPanel compact language={lang} onRetry={() => void guides.refetch()} /></div>
        ) : guides.data && guides.data.length > 0 ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {guides.data.slice(0, 4).map((g) => (
              <Link
                key={g.id}
                to="/guides/$slug"
                params={{ slug: g.slug }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
              >
                {g.cover ? (
                  <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                    <img src={g.cover} alt={g.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                ) : null}
                <div className="p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--bdg-gold-deep)]">
                    {g.category}
                  </span>
                  <h3 className="mt-1 font-display text-base font-semibold">{g.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{g.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
            No backend guide has been published yet. Publish a guide in Admin to show featured guides here.
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title={c?.faqTitle ?? "Frequently asked questions"}
          action={
            <Link to="/faq" className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--bdg-navy)] hover:underline">
              {c?.buttons.viewAll ?? "View all"} <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        {faqs.isError ? (
          <div className="mt-3"><ServiceErrorPanel compact language={lang} onRetry={() => void faqs.refetch()} /></div>
        ) : faqs.data && faqs.data.length > 0 ? (
          <Card className="mt-3 p-2">
            <Accordion type="single" collapsible>
              {faqs.data.slice(0, 4).map((f) => (
                <AccordionItem key={f.id} value={f.id} className="border-border">
                  <AccordionTrigger className="text-left text-sm">{f.question}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            No backend FAQ has been published yet.
          </div>
        )}
      </section>

      {/* Support CTA removed in v0.6.1. Public support buttons are controlled from admin and default OFF. */}

    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="font-display text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
      {action}
    </div>
  );
}