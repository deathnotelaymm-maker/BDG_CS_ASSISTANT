import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Info, AlertTriangle, LifeBuoy, ArrowRight, Loader2 } from "lucide-react";
import { api, getPublicLanguage } from "@/lib/api";
import type { GuideBlock } from "@/mock/data";
import { Button } from "@/components/ui/button";
import { ServiceErrorPanel } from "@/components/public/ServiceErrorPanel";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_public/guides/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${params.slug.replace(/[-_]/g, " ")} — BDG Help Center` }],
  }),
  component: GuideDetail,
  notFoundComponent: () => {
    const lang = getPublicLanguage();
    const copy = lang === "hi"
      ? { title: "गाइड नहीं मिला", body: "यह गाइड उपलब्ध नहीं है।", back: "सभी गाइड देखें" }
      : { title: "Guide not found", body: "The guide you're looking for doesn't exist.", back: "Browse all guides" };
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
        <Link to="/guides" className="mt-4 inline-block text-sm font-medium text-[color:var(--bdg-navy)] underline">
          {copy.back}
        </Link>
      </div>
    );
  },
});

function GuideDetail() {
  const { slug } = Route.useParams();
  const lang = getPublicLanguage();
  const copy = lang === "hi"
    ? {
        all: "सभी गाइड",
        loading: "गाइड खुल रहा है…",
        updated: "अंतिम अपडेट",
        relatedFaq: "संबंधित FAQ",
        relatedGuides: "संबंधित गाइड",
        contactTitle: "क्या आपका सवाल अभी भी बाकी है?",
        contactSub: "कृपया official support team से संपर्क करें।",
        contact: "Support से संपर्क करें",
      }
    : {
        all: "All guides",
        loading: "Opening guide…",
        updated: "Last updated",
        relatedFaq: "Related FAQ",
        relatedGuides: "Related guides",
        contactTitle: "Still need help?",
        contactSub: "Reach out to the official support team.",
        contact: "Contact support",
      };

  const { data: guide, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["guide", slug, lang],
    queryFn: () => api.getGuide(slug),
  });
  const { data: allGuides } = useQuery({ queryKey: ["guides", lang], queryFn: () => api.getGuides() });
  const { data: allFaqs } = useQuery({ queryKey: ["faqs", lang], queryFn: api.getFaqs });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {copy.loading}
      </div>
    );
  }
  if (isError) {
    if ((error as Error & { status?: number })?.status === 404) throw notFound();
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-16">
        <Link to="/guides" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {copy.all}
        </Link>
        <ServiceErrorPanel language={lang} onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!guide) throw notFound();

  const related = allGuides?.filter((g) => guide.relatedGuides?.includes(g.slug) && g.slug !== guide.slug) ?? [];
  const faqs = allFaqs?.filter((f) => guide.relatedFaqs?.includes(f.id)) ?? [];

  return (
    <article className="mx-auto max-w-4xl space-y-7 pb-12">
      <Link to="/guides" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {copy.all}
      </Link>

      <header className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-card)]">
        {guide.cover && (
          <div className="aspect-[16/7] w-full overflow-hidden bg-muted">
            <img src={guide.cover} alt={guide.title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="space-y-4 p-5 md:p-7">
          <Badge className="bg-[color:var(--bdg-navy)] text-white uppercase tracking-wide">{guide.category}</Badge>
          <div>
            <h1 className="font-display text-3xl font-black leading-tight tracking-tight md:text-5xl">{guide.title}</h1>
            {guide.summary && <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">{guide.summary}</p>}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> {copy.updated} {guide.updatedAt || ""}
          </div>
        </div>
      </header>

      <section className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow-card)] md:p-8">
        <div className="space-y-5">
          {guide.blocks.map((b, i) => <BlockView key={i} block={b} />)}
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="font-display text-lg font-bold">{copy.relatedFaq}</h3>
          <ul className="mt-3 divide-y divide-border">
            {faqs.map((f) => (
              <li key={f.id} className="py-3">
                <div className="text-sm font-semibold">{f.question}</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">{f.answer}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h3 className="font-display text-lg font-bold">{copy.relatedGuides}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {related.map((g) => (
              <Link
                key={g.id}
                to="/guides/$slug"
                params={{ slug: g.slug }}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] hover:bg-muted"
              >
                <div>
                  <div className="text-sm font-bold">{g.title}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{g.summary}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {guide.supportCta !== false && (
        <section className="rounded-[2rem] p-5 text-white shadow-[var(--shadow-card)]" style={{ background: "var(--gradient-hero)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <LifeBuoy className="h-7 w-7 shrink-0" style={{ color: "var(--bdg-gold)" }} />
            <div className="flex-1">
              <div className="font-display text-lg font-bold">{copy.contactTitle}</div>
              <div className="text-sm text-white/75">{copy.contactSub}</div>
            </div>
            <Link to="/support">
              <Button className="w-full bg-[color:var(--bdg-gold)] text-[color:var(--bdg-navy-deep)] hover:bg-[color:var(--bdg-gold-deep)] sm:w-auto">
                {copy.contact}
              </Button>
            </Link>
          </div>
        </section>
      )}
    </article>
  );
}

function BlockView({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "heading":
      return block.level === 3
        ? <h3 className="rounded-xl bg-muted/60 px-4 py-3 font-display text-lg font-bold leading-snug">{block.text}</h3>
        : <h2 className="border-b border-border pb-2 font-display text-2xl font-black leading-tight">{block.text}</h2>;
    case "paragraph":
      return <p className="text-[15px] leading-8 text-foreground/90 md:text-base">{block.text}</p>;
    case "image":
      return (
        <figure className="overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
          <img src={block.url} alt={block.alt ?? ""} className="w-full object-contain" />
          {block.caption && <figcaption className="border-t border-border bg-card p-2 text-center text-xs text-muted-foreground">{block.caption}</figcaption>}
        </figure>
      );
    case "step":
      return (
        <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-xl px-2 text-xs font-black text-[color:var(--bdg-navy-deep)]"
              style={{ background: "var(--gradient-gold)" }}
            >
              {block.title}
            </span>
            <p className="pt-1 text-[15px] leading-7 text-foreground/90 md:text-base">{block.text}</p>
          </div>
          {block.image && <img src={block.image} alt="" className="mt-4 w-full rounded-xl border border-border" />}
        </div>
      );
    case "note":
      return (
        <div className="flex gap-3 rounded-2xl border border-[color:var(--bdg-navy)]/20 bg-[color:var(--bdg-navy)]/5 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--bdg-navy)]" />
          <p className="text-sm leading-7 text-foreground/90 md:text-[15px]">{block.text}</p>
        </div>
      );
    case "warning":
      return (
        <div className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm leading-7 text-foreground/90 md:text-[15px]">{block.text}</p>
        </div>
      );
    case "button":
      return (
        <a href={block.url} className="inline-flex">
          <Button className="bg-[color:var(--bdg-gold)] text-[color:var(--bdg-navy-deep)] hover:bg-[color:var(--bdg-gold-deep)]">
            {block.label}
          </Button>
        </a>
      );
    case "divider":
      return <hr className="border-border" />;
    case "faqRef":
      return <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">↪ FAQ: {block.faqId}</div>;
  }
}
