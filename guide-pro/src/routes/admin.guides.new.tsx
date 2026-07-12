import { createFileRoute } from "@tanstack/react-router";
import { GuideEditor } from "@/components/admin/GuideEditor";

export const Route = createFileRoute("/admin/guides/new")({
  component: () => <GuideEditor mode="create" />,
});