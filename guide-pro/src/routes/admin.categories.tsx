import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { CategoryIcon } from "@/components/public/CategoryIcon";

export const Route = createFileRoute("/admin/categories")({
  component: Categories,
});

function Categories() {
  const { data } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });
  return (
    <>
      <PageHeader
        title="Categories"
        description="Group guides by topic. Categories power the browse-by-topic section."
        actions={<Button className="bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)]"><Plus className="mr-1 h-4 w-4" /> New category</Button>}
      />
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Icon</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.slug}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs">
                    <CategoryIcon name={c.icon} className="h-3.5 w-3.5" /> {c.icon}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.description}</td>
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