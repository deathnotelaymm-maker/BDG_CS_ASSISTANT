import { createFileRoute } from "@tanstack/react-router";
import DataPage, { StatusTag } from "@/components/DataPage";

export const Route = createFileRoute("/_admin/categories")({
  component: () => (
    <DataPage
      resource="categories"
      createLabel="New category"
      columns={[
        { title: "Name", dataIndex: "name" },
        { title: "Slug", dataIndex: "slug", width: 180 },
        { title: "Guides", dataIndex: "guides", width: 100 },
        { title: "Status", dataIndex: "status", width: 120, render: (v) => <StatusTag value={v} /> },
      ]}
      editableFields={[
        { name: "name", label: "Name" },
        { name: "slug", label: "Slug" },
        { name: "status", label: "Status", type: "select", options: ["active", "inactive"] },
      ]}
    />
  ),
});
