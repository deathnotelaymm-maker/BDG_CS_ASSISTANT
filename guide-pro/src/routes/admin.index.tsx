import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Eye, Star, HelpCircle, Plus, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminApi, api } from "@/lib/api";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const guides = useQuery({ queryKey: ["admin-guides"], queryFn: adminApi.getGuides });
  const faqs = useQuery({ queryKey: ["admin-faqs"], queryFn: api.getFaqs });
  const popular = useQuery({ queryKey: ["admin-popular"], queryFn: adminApi.getPopularHelp });

  const totalViews = guides.data?.reduce((s, g) => s + (g.views ?? 0), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your BDG Help Center content."
        actions={
          <Link to="/admin/guides/new">
            <Button className="bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)]">
              <Plus className="mr-1 h-4 w-4" /> New guide
            </Button>
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Guides" value={guides.data?.length ?? 0} icon={<BookOpen className="h-4 w-4" />} delta="Total published & drafts" />
        <StatCard label="FAQ" value={faqs.data?.length ?? 0} icon={<HelpCircle className="h-4 w-4" />} />
        <StatCard label="Popular help" value={popular.data?.length ?? 0} icon={<Star className="h-4 w-4" />} />
        <StatCard label="Total views" value={totalViews.toLocaleString()} icon={<Eye className="h-4 w-4" />} delta="Last 30 days" />
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Recent guides</h2>
            <p className="text-xs text-muted-foreground">Latest updates from your content team.</p>
          </div>
          <Link to="/admin/guides" className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--bdg-navy)] hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Views</th>
                <th className="px-3 py-2 text-left">Updated</th>
              </tr>
            </thead>
            <tbody>
              {guides.data?.slice(0, 5).map((g) => (
                <tr key={g.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{g.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{g.category}</td>
                  <td className="px-3 py-2"><StatusBadge status={g.status} /></td>
                  <td className="px-3 py-2 text-right tabular-nums">{(g.views ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-muted-foreground">{g.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}