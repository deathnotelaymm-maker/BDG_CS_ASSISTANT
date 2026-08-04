import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/ai-knowledge")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-content-studio" });
  },
});
