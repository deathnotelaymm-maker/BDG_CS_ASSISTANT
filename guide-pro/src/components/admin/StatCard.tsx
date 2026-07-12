import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

export function StatCard({ label, value, delta, icon }: { label: string; value: string | number; delta?: string; icon?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon && <div className="text-[color:var(--bdg-gold-deep)]">{icon}</div>}
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
      {delta && <div className="mt-1 text-xs text-muted-foreground">{delta}</div>}
    </Card>
  );
}