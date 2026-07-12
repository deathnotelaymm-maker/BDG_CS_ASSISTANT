import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, GitCommit } from "lucide-react";

const VERSIONS = [
  { id: "v12", title: "How to make your first deposit", author: "Aisha", when: "2 hours ago", note: "Added KYC warning callout" },
  { id: "v11", title: "How to withdraw your winnings", author: "Vikram", when: "1 day ago", note: "Updated screenshots for step 3" },
  { id: "v10", title: "Bank card setup", author: "Priya", when: "3 days ago", note: "Rewrote intro paragraph" },
  { id: "v9", title: "Login problems and account recovery", author: "Aisha", when: "1 week ago", note: "Fixed typo in OTP note" },
];

export const Route = createFileRoute("/admin/versions")({
  component: Versions,
});

function Versions() {
  return (
    <>
      <PageHeader title="Guide version history" description="Every change is tracked. Roll back to a previous version at any time." />
      <Card className="divide-y divide-border">
        {VERSIONS.map((v) => (
          <div key={v.id} className="flex items-start gap-4 p-4">
            <div className="mt-1 grid h-8 w-8 place-items-center rounded-full bg-[color:var(--bdg-navy)] text-[color:var(--bdg-gold)]">
              <GitCommit className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{v.title}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{v.id}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{v.author} · {v.when}</div>
              <div className="mt-1 text-sm">{v.note}</div>
            </div>
            <Button variant="outline" size="sm"><RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore</Button>
          </div>
        ))}
      </Card>
    </>
  );
}