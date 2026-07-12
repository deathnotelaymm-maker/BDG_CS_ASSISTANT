import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin")({
  component: AdminShell,
});

function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Login page renders bare, without the sidebar chrome.
  if (pathname === "/admin/login") return <Outlet />;
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}