import { createFileRoute } from "@tanstack/react-router";
import DataPage, { StatusTag } from "@/components/DataPage";

export const Route = createFileRoute("/_admin/site-content")({
  component: () => (
    <DataPage
      resource="site-content"
      createLabel="New content key"
      columns={[
        { title: "Key", dataIndex: "key", width: 220 },
        { title: "Value", dataIndex: "value" },
        { title: "Locale", dataIndex: "locale", width: 100 },
        { title: "Updated", dataIndex: "updatedAt", width: 140 },
      ]}
      editableFields={[
        { name: "key", label: "Key" },
        { name: "value", label: "Value", type: "textarea" },
        { name: "locale", label: "Locale", type: "select", options: ["en", "es", "pt", "zh"] },
      ]}
    />
  ),
});
