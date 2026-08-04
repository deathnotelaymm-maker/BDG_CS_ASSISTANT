import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/ai-reliability")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-prompt-manager" });
  },
});
