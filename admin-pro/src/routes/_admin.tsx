import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import AdminLayout from "@/components/AdminLayout";

export const Route = createFileRoute("/_admin")({
  beforeLoad: () => {
    if (typeof localStorage !== "undefined") {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("bdg_token");
      if (!token) throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});
