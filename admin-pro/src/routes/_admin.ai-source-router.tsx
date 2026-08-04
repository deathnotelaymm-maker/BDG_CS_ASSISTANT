import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/ai-source-router")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-prompt-manager" });
  },
});
