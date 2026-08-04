import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/locale-studio")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-prompt-manager" });
  },
});
