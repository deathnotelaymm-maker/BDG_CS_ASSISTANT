import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

export function CategoryIcon({ name, url, className, ...props }: { name: string; url?: string } & LucideProps) {
  const safeUrl = String(url || "").trim();
  if (safeUrl && (safeUrl.startsWith("/") || /^https?:\/\//i.test(safeUrl))) {
    return <img src={safeUrl} alt="" className={className} style={{ objectFit: "contain" }} />;
  }
  const Icon = (Lucide as any)[name] ?? Lucide.HelpCircle;
  return <Icon className={className} {...props} />;
}
