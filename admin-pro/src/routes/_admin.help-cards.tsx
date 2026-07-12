import { createFileRoute } from "@tanstack/react-router";
import DataPage, { StatusTag } from "@/components/DataPage";

export const Route = createFileRoute("/_admin/help-cards")({
  component: () => (
    <DataPage
      resource="help-cards"
      createLabel="New help card"
      columns={[
        { title: "Title", dataIndex: "title" },
        { title: "Views", dataIndex: "views", width: 120 },
        { title: "Order", dataIndex: "order", width: 90 },
        { title: "Status", dataIndex: "status", width: 120, render: (v) => <StatusTag value={v} /> },
      ]}
      editableFields={[
        { name: "title", label: "Title" },
        { name: "order", label: "Display order" },
        { name: "status", label: "Status", type: "select", options: ["active", "inactive"] },
      ]}
    />
  ),
});
