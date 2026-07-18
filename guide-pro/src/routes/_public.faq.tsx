import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { api, getPlatformCacheKey, getPublicLanguage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import type { Faq } from "@/mock/data";
import { ServiceErrorPanel } from "@/components/public/ServiceErrorPanel";

export const Route = createFileRoute("/_public/faq")({
  head: () => ({ meta: [{ title: "FAQ — BDG Help Center" }] }),
  component: FAQ,
});

function safeFaqHtml(value: string) {
  return String(value || "")
    .replace(/<\/?script[^>]*>/gi, "")
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}

function FAQ() {
  const platformKey = getPlatformCacheKey();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["faqs", platformKey], queryFn: api.getFaqs });
  const lang = getPublicLanguage();
  const [q, setQ] = useState("");
  const filtered = useMemo<Faq[]>(() => {
    if (!data) return [];
    const s = q.toLowerCase();
    if (!s) return data;
    return data.filter((f) => f.question.toLowerCase().includes(s) || f.answer.toLowerCase().includes(s) || (f.answerHtml || "").toLowerCase().includes(s));
  }, [data, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Faq[]>();
    filtered.forEach((f) => {
      const key = f.category ?? "general";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Frequently asked questions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quick answers to the most common questions.</p>
      </header>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search FAQ…" className="h-11 rounded-xl pl-9" />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading FAQ…
        </div>
      )}

      {isError && <ServiceErrorPanel language={lang} onRetry={() => void refetch()} />}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No matching questions.
        </div>
      )}

      {!isLoading && !isError && <div className="space-y-4">
        {grouped.map(([cat, items]) => (
          <Card key={cat} className="p-3">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--bdg-gold-deep)]">
              {cat}
            </div>
            <Accordion type="single" collapsible>
              {items.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="text-left text-sm">{f.question}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {f.answerHtml ? <div className="bdg-rich-public" dangerouslySetInnerHTML={{ __html: safeFaqHtml(f.answerHtml) }} /> : f.answer}
                    {!!f.imageUrls?.length && <div className="mt-3 grid gap-2 sm:grid-cols-2">{f.imageUrls.map((url) => <img key={url} src={url} alt="FAQ reference" className="max-h-64 w-full rounded-xl object-contain" loading="lazy" />)}</div>}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        ))}
      </div>}
    </div>
  );
}
