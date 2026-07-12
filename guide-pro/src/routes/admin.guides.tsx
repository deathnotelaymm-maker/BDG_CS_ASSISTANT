import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Plus, Search, Download, Eye, Pencil, Copy, Archive } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";

export const Route = createFileRoute("/admin/guides")({
  component: GuidesList,
});

function GuidesList() {
  const { data } = useQuery({ queryKey: ["admin-guides"], queryFn: adminApi.getGuides });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    return (data ?? []).filter((g) => {
      if (status !== "all" && g.status !== status) return false;
      if (q && !g.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, status]);

  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  return (
    <>
      <PageHeader
        title="Guides"
        description="Manage all published guides, drafts, and archived tutorials."
        actions={
          <>
            <Button variant="outline"><Download className="mr-1 h-4 w-4" /> Export</Button>
            <Link to="/admin/guides/new">
              <Button className="bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)]">
                <Plus className="mr-1 h-4 w-4" /> New guide
              </Button>
            </Link>
          </>
        }
      />
      <Card className="p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guides…" className="pl-9" />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Priority</th>
                <th className="px-3 py-2 text-right">Views</th>
                <th className="px-3 py-2 text-left">Updated</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((g) => (
                <tr key={g.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2 font-medium">{g.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{g.category}</td>
                  <td className="px-3 py-2"><StatusBadge status={g.status} /></td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.priority}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{(g.views ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-muted-foreground">{g.updatedAt}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Link to="/guides/$slug" params={{ slug: g.slug }} target="_blank" className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-muted" title="Preview">
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <Link to="/admin/guides/$id" params={{ id: g.id }} className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-muted" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-muted" title="Duplicate">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-muted" title="Archive">
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No guides match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div>{filtered.length} guides</div>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-border px-2 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-border px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}