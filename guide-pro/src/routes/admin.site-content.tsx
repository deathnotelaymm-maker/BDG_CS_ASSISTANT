import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/api";
import type { SiteContent } from "@/mock/data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/site-content")({
  component: SiteContentPage,
});

function SiteContentPage() {
  const { data } = useQuery({ queryKey: ["admin-site-content"], queryFn: adminApi.getSiteContent });
  const [form, setForm] = useState<SiteContent | null>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  if (!form) return null;

  const update = (k: keyof SiteContent, v: string) => setForm({ ...form, [k]: v });
  const updateBtn = (k: keyof SiteContent["buttons"], v: string) =>
    setForm({ ...form, buttons: { ...form.buttons, [k]: v } });

  return (
    <>
      <PageHeader
        title="Site content"
        description="Edit every text label shown on the public Help Center."
        actions={
          <Button
            className="bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)]"
            onClick={async () => { await adminApi.updateSiteContent(form); toast.success("Site content saved"); }}
          >
            <Save className="mr-1 h-4 w-4" /> Save changes
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Hero section</h3>
          <Field label="Hero title" value={form.heroTitle} onChange={(v) => update("heroTitle", v)} />
          <Field label="Hero subtitle" value={form.heroSubtitle} onChange={(v) => update("heroSubtitle", v)} />
          <Field label="Search placeholder" value={form.searchPlaceholder} onChange={(v) => update("searchPlaceholder", v)} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Section titles</h3>
          <Field label="Popular help title" value={form.popularHelpTitle} onChange={(v) => update("popularHelpTitle", v)} />
          <Field label="Topics title" value={form.topicsTitle} onChange={(v) => update("topicsTitle", v)} />
          <Field label="Featured guides title" value={form.featuredGuidesTitle} onChange={(v) => update("featuredGuidesTitle", v)} />
          <Field label="FAQ title" value={form.faqTitle} onChange={(v) => update("faqTitle", v)} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Support CTA</h3>
          <Field label="Title" value={form.supportCtaTitle} onChange={(v) => update("supportCtaTitle", v)} />
          <Field label="Subtitle" value={form.supportCtaSubtitle} onChange={(v) => update("supportCtaSubtitle", v)} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold">States & buttons</h3>
          <Area label="Empty state text" value={form.emptyStateText} onChange={(v) => update("emptyStateText", v)} />
          <Area label="Error state text" value={form.errorStateText} onChange={(v) => update("errorStateText", v)} />
          <Field label="Contact support button" value={form.buttons.contactSupport} onChange={(v) => updateBtn("contactSupport", v)} />
          <Field label="Read guide button" value={form.buttons.readGuide} onChange={(v) => updateBtn("readGuide", v)} />
          <Field label="View all button" value={form.buttons.viewAll} onChange={(v) => updateBtn("viewAll", v)} />
        </Card>
      </div>
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3 space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3 space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}