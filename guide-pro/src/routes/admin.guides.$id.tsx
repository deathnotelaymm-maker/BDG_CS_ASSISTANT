import { createFileRoute } from "@tanstack/react-router";
import { GuideEditor } from "@/components/admin/GuideEditor";

export const Route = createFileRoute("/admin/guides/$id")({
  component: EditGuide,
});

function EditGuide() {
  const { id } = Route.useParams();
  return <GuideEditor mode="edit" id={id} />;
}