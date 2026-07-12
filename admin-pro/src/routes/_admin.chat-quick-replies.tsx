import { createFileRoute } from "@tanstack/react-router";
import DataPage, { StatusTag } from "@/components/DataPage";

export const Route = createFileRoute("/_admin/chat-quick-replies")({
  component: () => (
    <DataPage
      resource="chat-quick-replies"
      createLabel="New quick reply"
      enableDuplicateCleanup
      enableDeleteAll
      columns={[
        { title: "Label", dataIndex: "label", width: 160 },
        { title: "Text", dataIndex: "text" },
        { title: "Status", dataIndex: "status", width: 120, render: (v) => <StatusTag value={v} /> },
      ]}
      editableFields={[
        { name: "label", label: "Label" },
        { name: "text", label: "Reply text", type: "textarea" },
        { name: "status", label: "Status", type: "select", options: ["active", "inactive"] },
      ]}
    />
  ),
});
