import { createFileRoute } from "@tanstack/react-router";
import DataPage, { StatusTag } from "@/components/DataPage";

export const Route = createFileRoute("/_admin/faq")({
  component: () => (
    <DataPage
      resource="faq"
      createLabel="New FAQ"
      columns={[
        { title: "Question", dataIndex: "question" },
        { title: "Category", dataIndex: "category", width: 160 },
        { title: "Status", dataIndex: "status", width: 120, render: (v) => <StatusTag value={v} /> },
        { title: "Updated", dataIndex: "updatedAt", width: 140 },
      ]}
      editableFields={[
        { name: "question", label: "Question" },
        { name: "category", label: "Category" },
        { name: "status", label: "Status", type: "select", options: ["published", "draft"] },
      ]}
    />
  ),
});
