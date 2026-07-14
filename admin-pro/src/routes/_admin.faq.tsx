import { createFileRoute } from "@tanstack/react-router";
import DataPage, { StatusTag } from "@/components/DataPage";

export const Route = createFileRoute("/_admin/faq")({
  component: () => (
    <DataPage
      resource="faq"
      createLabel="New FAQ"
      columns={[
        { title: "Question", dataIndex: "question" },
        { title: "Answer", dataIndex: "answer", ellipsis: true },
        { title: "Priority", dataIndex: "priority", width: 90 },
        { title: "Status", dataIndex: "status", width: 120, render: (v) => <StatusTag value={v} /> },
      ]}
      editableFields={[
        { name: "question", label: "Question" },
        { name: "answer", label: "FAQ answer", type: "textarea", rows: 10, help: "This exact approved answer is published to the Guide page and made available to the AI knowledge layer." },
        { name: "keywords", label: "Search keywords and common misspellings", type: "textarea", rows: 4, required: false },
        { name: "priority", label: "Display priority", type: "number", required: false },
        { name: "status", label: "Status", type: "select", options: ["published", "draft"] },
      ]}
    />
  ),
});
