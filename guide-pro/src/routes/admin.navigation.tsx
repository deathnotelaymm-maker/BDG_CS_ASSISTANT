import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CategoryIcon } from "@/components/public/CategoryIcon";

export const Route = createFileRoute("/admin/navigation")({
  component: Navigation,
});

type Item = { id: string; label: string; icon: string; link: string; sort: number; active: boolean };
const seed: Item[] = [
  { id: "n1", label: "Home", icon: "Home", link: "/", sort: 1, active: true },
  { id: "n2", label: "Guides", icon: "BookOpen", link: "/guides", sort: 2, active: true },
  { id: "n3", label: "FAQ", icon: "MessageSquare", link: "/faq", sort: 3, active: true },
  { id: "n4", label: "Support", icon: "LifeBuoy", link: "/support", sort: 4, active: true },
];

function Navigation() {
  const [items] = useState<Item[]>(seed);
  return (
    <>
      <PageHeader
        title="Navigation"
        description="Manage the mobile bottom navigation. AI Chat is intentionally excluded."
        actions={<Button className="bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)]"><Plus className="mr-1 h-4 w-4" /> New nav item</Button>}
      />
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-8"></th>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-left">Icon</th>
              <th className="px-3 py-2 text-left">Link</th>
              <th className="px-3 py-2 text-right">Sort</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="pl-2 text-muted-foreground"><GripVertical className="h-4 w-4" /></td>
                <td className="px-3 py-2 font-medium">{i.label}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-0.5 text-xs">
                    <CategoryIcon name={i.icon} className="h-3.5 w-3.5" /> {i.icon}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{i.link}</td>
                <td className="px-3 py-2 text-right tabular-nums">{i.sort}</td>
                <td className="px-3 py-2"><StatusBadge status={i.active ? "active" : "inactive"} /></td>
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