import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/public/PublicLayout";

export const Route = createFileRoute("/_public")({
  component: () => (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  ),
});