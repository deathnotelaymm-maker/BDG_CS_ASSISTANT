import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/ai-response-quality")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-diagnostics" });
  },
});
