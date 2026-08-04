import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/prompt-history")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-prompt-manager" });
  },
});
