import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ImagePlus, Save, X, Eye } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { adminApi, api } from "@/lib/api";
import type { Guide, GuideBlock } from "@/mock/data";

type Props = { mode: "create" | "edit"; id?: string };

const blank: Guide = {
  id: "",
  slug: "",
  title: "",
  summary: "",
  category: "",
  cover: "",
  updatedAt: new Date().toISOString().slice(0, 10),
  status: "draft",
  priority: 10,
  keywords: [],
  blocks: [],
  supportCta: true,
};

export function GuideEditor({ mode, id }: Props) {
  const navigate = useNavigate();
  const { data: existing } = useQuery({
    queryKey: ["admin-guide", id],
    queryFn: () => api.getGuide(id!),
    enabled: mode === "edit" && !!id,
  });
  const cats = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });

  const [form, setForm] = useState<Guide>(blank);

  useEffect(() => {
    if (existing) setForm(existing);
  }, [existing]);

  const update = <K extends keyof Guide>(k: K, v: Guide[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    try {
      if (mode === "create") await adminApi.createGuide(form);
      else await adminApi.updateGuide(id!, form);
      toast.success(mode === "create" ? "Guide created" : "Guide saved");
      navigate({ to: "/admin/guides" });
    } catch {
      toast.error("Save failed");
    }
  };

  const onCoverPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await adminApi.upload(file);
    update("cover", url);
    toast.success("Cover uploaded");
  };

  return (
    <>
      <PageHeader
        title={mode === "create" ? "Create guide" : "Edit guide"}
        description="Compose your guide with rich content blocks."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate({ to: "/admin/guides" })}>
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
            <Button variant="outline"><Eye className="mr-1 h-4 w-4" /> Preview</Button>
            <Button onClick={save} className="bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)]">
              <Save className="mr-1 h-4 w-4" /> Save
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="How to make your first deposit" />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="how-to-deposit" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  <option value="">Select category</option>
                  {cats.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Short summary</Label>
                <Textarea rows={2} value={form.summary} onChange={(e) => update("summary", e.target.value)} placeholder="One-line description shown in cards and search results." />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Search keywords</Label>
                <Input
                  value={(form.keywords ?? []).join(", ")}
                  onChange={(e) => update("keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="deposit, payment, add funds"
                />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Content</h3>
                <p className="text-xs text-muted-foreground">Compose blocks like a Tiptap document.</p>
              </div>
            </div>
            <BlockEditor value={form.blocks} onChange={(blocks: GuideBlock[]) => update("blocks", blocks)} />
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Publishing</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => update("status", e.target.value as Guide["status"])}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority / sort order</Label>
                <Input type="number" value={form.priority} onChange={(e) => update("priority", Number(e.target.value))} />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-sm font-medium">Support CTA</div>
                  <div className="text-xs text-muted-foreground">Show contact-support button at the end.</div>
                </div>
                <Switch checked={form.supportCta ?? true} onCheckedChange={(v) => update("supportCta", v)} />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Cover image</h3>
            {form.cover ? (
              <div className="space-y-2">
                <img src={form.cover} alt="" className="aspect-[16/9] w-full rounded-md object-cover" />
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input type="file" accept="image/*" className="hidden" onChange={onCoverPick} />
                    <Button variant="outline" size="sm" className="w-full" asChild><span>Replace</span></Button>
                  </label>
                  <Button variant="outline" size="sm" onClick={() => update("cover", "")}>Remove</Button>
                </div>
              </div>
            ) : (
              <label className="flex aspect-[16/9] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 text-xs text-muted-foreground hover:bg-muted">
                <ImagePlus className="h-6 w-6" />
                Upload cover image
                <input type="file" accept="image/*" className="hidden" onChange={onCoverPick} />
              </label>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Related</h3>
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Related guide slugs</Label>
                <Input
                  value={(form.relatedGuides ?? []).join(", ")}
                  onChange={(e) => update("relatedGuides", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="how-to-withdraw, bank-card-setup"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Related FAQ ids</Label>
                <Input
                  value={(form.relatedFaqs ?? []).join(", ")}
                  onChange={(e) => update("relatedFaqs", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="f1, f2"
                />
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}