import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = (Lucide as any)[name] ?? Lucide.HelpCircle;
  return <Icon {...props} />;
}