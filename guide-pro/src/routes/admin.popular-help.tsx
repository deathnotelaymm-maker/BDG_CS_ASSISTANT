import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CategoryIcon } from "@/components/public/CategoryIcon";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/popular-help")({
  component: PopularHelp,
});

function PopularHelp() {
  const { data, refetch } = useQuery({ queryKey: ["admin-popular"], queryFn: adminApi.getPopularHelp });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", subtitle: "", icon: "Wallet", link: "", sort: 1, active: true });

  return (
    <>
      <PageHeader
        title="Popular help"
        description="Manage the highlight cards on the Help Center home page."
        actions={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button className="bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)]">
                <Plus className="mr-1 h-4 w-4" /> New card
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>New popular help card</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5"><Label>Title</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Subtitle</Label><Input value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Icon (Lucide name)</Label><Input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Link</Label><Input value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} placeholder="/guides/how-to-deposit" /></div>
                <div className="space-y-1.5"><Label>Sort order</Label><Input type="number" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value) })} /></div>
                <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /></div>
                <Button className="w-full" onClick={async () => { await adminApi.createPopularHelp(draft); toast.success("Card added"); setOpen(false); refetch(); }}>Save card</Button>
              </div>
            </SheetContent>
          </Sheet>
        }
      />
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-8"></th>
              <th className="px-3 py-2 text-left">Card</th>
              <th className="px-3 py-2 text-left">Link</th>
              <th className="px-3 py-2 text-right">Sort</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.sort((a, b) => a.sort - b.sort).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="pl-2 text-muted-foreground"><GripVertical className="h-4 w-4" /></td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--bdg-navy-deep)]" style={{ background: "var(--gradient-gold)" }}>
                      <CategoryIcon name={p.icon} className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.subtitle}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.link}</td>
                <td className="px-3 py-2 text-right tabular-nums">{p.sort}</td>
                <td className="px-3 py-2"><StatusBadge status={p.active ? "active" : "inactive"} /></td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                    <button className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}