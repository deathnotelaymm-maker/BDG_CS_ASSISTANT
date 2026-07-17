import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Info, AlertTriangle, LifeBuoy, ArrowRight, Loader2, ExternalLink } from "lucide-react";
import { api, getPlatformCacheKey, getPublicLanguage } from "@/lib/api";
import type { GuideBlock } from "@/mock/data";
import { Button } from "@/components/ui/button";
import { ServiceErrorPanel } from "@/components/public/ServiceErrorPanel";
import { Badge } from "@/components/ui/badge";
import { GuideImageLightbox, openGuideImage } from "@/components/public/GuideImageLightbox";

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
  const platformKey = getPlatformCacheKey();
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
    queryKey: ["guide", platformKey, slug, lang],
    queryFn: () => api.getGuide(slug),
  });
  const { data: allGuides } = useQuery({ queryKey: ["guides", platformKey, lang], queryFn: () => api.getGuides() });
  const { data: allFaqs } = useQuery({ queryKey: ["faqs", platformKey, lang], queryFn: api.getFaqs });

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
            <button type="button" className="h-full w-full cursor-zoom-in" onClick={()=>openGuideImage(guide.cover,guide.title)}><img src={guide.cover} alt={guide.title} className="h-full w-full object-cover" /></button>
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
          {guide.richDocument ? <RichDocumentView document={guide.richDocument} /> : guide.blocks.map((b, i) => <BlockView key={i} block={b} />)}
        </div>
      </section>

      {!!guide.actionButtons?.length && <section className="grid gap-3 sm:grid-cols-2">{guide.actionButtons.map((action)=><a key={action.id} href={action.url} target={action.target === "new_window" ? "_blank" : undefined} rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] hover:bg-muted">{action.icon_url ? <img src={action.icon_url} alt="" className="h-10 w-10 rounded-xl object-contain"/> : <ArrowRight className="h-5 w-5"/>}<span className="min-w-0 flex-1"><b className="block text-sm">{action.label}</b>{action.subtitle && <span className="block text-xs text-muted-foreground">{action.subtitle}</span>}</span><ExternalLink className="h-4 w-4 text-muted-foreground"/></a>)}</section>}

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
      <GuideImageLightbox />
    </article>
  );
}

function safeUrl(value:unknown) { const url=String(value||"").trim(); return url.startsWith("/") || /^https?:\/\//i.test(url) ? url : ""; }
function RichDocumentView({ document }: { document:any }) { return <div className="space-y-4">{(document?.content || []).map((node:any,index:number)=><RichNode key={index} node={node}/>)}</div>; }
function RichInline({ nodes=[] }: { nodes?:any[] }) { return <>{nodes.map((node,index)=>{
  if (node.type === "hardBreak") return <br key={index}/>;
  if (node.type !== "text") return <RichNode key={index} node={node}/>;
  let content:any = node.text || "";
  for (const mark of node.marks || []) {
    if (mark.type === "bold") content=<strong>{content}</strong>;
    else if (mark.type === "italic") content=<em>{content}</em>;
    else if (mark.type === "underline") content=<u>{content}</u>;
    else if (mark.type === "strike") content=<s>{content}</s>;
    else if (mark.type === "textStyle" && /^#[0-9a-f]{3,8}$/i.test(mark.attrs?.color || "")) content=<span style={{color:mark.attrs.color}}>{content}</span>;
    else if (mark.type === "highlight" && /^#[0-9a-f]{3,8}$/i.test(mark.attrs?.color || "")) content=<mark style={{backgroundColor:mark.attrs.color}}>{content}</mark>;
    else if (mark.type === "link" && safeUrl(mark.attrs?.href)) content=<a href={safeUrl(mark.attrs.href)} target="_blank" rel="noreferrer" className="font-semibold text-[color:var(--bdg-navy)] underline">{content}</a>;
  }
  return <span key={index}>{content}</span>;
})}</>; }
function RichNode({ node }: { node:any }): any {
  const children=node?.content || [];
  if (node.type === "paragraph") return <p className="text-[15px] leading-8 text-foreground/90 md:text-base" style={{textAlign:node.attrs?.textAlign || undefined}}><RichInline nodes={children}/></p>;
  if (node.type === "heading") { const level=Math.min(3,Math.max(1,Number(node.attrs?.level || 2))); return level === 1 ? <h2 className="font-display text-3xl font-black"><RichInline nodes={children}/></h2> : level === 3 ? <h3 className="font-display text-lg font-bold"><RichInline nodes={children}/></h3> : <h2 className="border-b border-border pb-2 font-display text-2xl font-black"><RichInline nodes={children}/></h2>; }
  if (node.type === "bulletList") return <ul className="list-disc space-y-2 pl-6">{children.map((child:any,index:number)=><RichNode key={index} node={child}/>)}</ul>;
  if (node.type === "orderedList") return <ol className="list-decimal space-y-2 pl-6">{children.map((child:any,index:number)=><RichNode key={index} node={child}/>)}</ol>;
  if (node.type === "listItem") return <li className="leading-7">{children.map((child:any,index:number)=><RichNode key={index} node={child}/>)}</li>;
  if (node.type === "blockquote") return <blockquote className="rounded-2xl border-l-4 border-[color:var(--bdg-gold)] bg-muted p-4">{children.map((child:any,index:number)=><RichNode key={index} node={child}/>)}</blockquote>;
  if (node.type === "image" && safeUrl(node.attrs?.src)) return <figure className="overflow-hidden rounded-2xl border border-border bg-muted"><button type="button" className="block w-full cursor-zoom-in" onClick={()=>openGuideImage(safeUrl(node.attrs.src),String(node.attrs?.alt || "Guide image"))}><img src={safeUrl(node.attrs.src)} alt={String(node.attrs?.alt || "")} className="w-full object-contain" loading="lazy"/></button></figure>;
  if (node.type === "horizontalRule") return <hr className="border-border"/>;
  if (node.type === "table") return <div className="overflow-x-auto"><table className="w-full border-collapse">{children.map((child:any,index:number)=><RichNode key={index} node={child}/>)}</table></div>;
  if (node.type === "tableRow") return <tr>{children.map((child:any,index:number)=><RichNode key={index} node={child}/>)}</tr>;
  if (node.type === "tableHeader") return <th className="border border-border bg-muted p-2 text-left"><RichInline nodes={children.flatMap((child:any)=>child.content || [child])}/></th>;
  if (node.type === "tableCell") return <td className="border border-border p-2"><RichInline nodes={children.flatMap((child:any)=>child.content || [child])}/></td>;
  return <>{children.map((child:any,index:number)=><RichNode key={index} node={child}/>)}</>;
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
          <button type="button" className="block w-full cursor-zoom-in" onClick={()=>openGuideImage(block.url,block.alt || "Guide image")}><img src={block.url} alt={block.alt ?? ""} className="w-full object-contain" /></button>
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
          {block.image && <button type="button" className="mt-4 block w-full cursor-zoom-in" onClick={()=>openGuideImage(block.image || "","Guide step image")}><img src={block.image} alt="" className="w-full rounded-xl border border-border" /></button>}
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
