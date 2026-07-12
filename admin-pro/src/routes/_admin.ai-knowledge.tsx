import { createFileRoute } from "@tanstack/react-router";
import DataPage, { StatusTag } from "@/components/DataPage";

export const Route = createFileRoute("/_admin/ai-knowledge")({
  component: () => (
    <DataPage
      resource="ai-knowledge"
      createLabel="Add knowledge"
      columns={[
        { title: "Title", dataIndex: "title" },
        { title: "Tokens", dataIndex: "tokens", width: 120 },
        { title: "Status", dataIndex: "status", width: 140, render: (v) => <StatusTag value={v} /> },
        { title: "Updated", dataIndex: "updatedAt", width: 140 },
      ]}
      editableFields={[
        { name: "title", label: "Title" },
        { name: "status", label: "Status", type: "select", options: ["indexed", "pending"] },
      ]}
    />
  ),
});
