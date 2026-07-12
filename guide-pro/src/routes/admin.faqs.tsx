import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/faqs")({
  component: Faqs,
});

function Faqs() {
  const { data } = useQuery({ queryKey: ["faqs"], queryFn: api.getFaqs });
  return (
    <>
      <PageHeader
        title="FAQ"
        description="Manage frequently asked questions shown in the Help Center."
        actions={<Button className="bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)]"><Plus className="mr-1 h-4 w-4" /> New FAQ</Button>}
      />
      <Card className="divide-y divide-border">
        {data?.map((f) => (
          <div key={f.id} className="flex items-start gap-4 p-4">
            <div className="flex-1">
              <div className="text-sm font-semibold">{f.question}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.answer}</div>
              {f.category && <div className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{f.category}</div>}
            </div>
            <div className="flex gap-1">
              <button className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
              <button className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}