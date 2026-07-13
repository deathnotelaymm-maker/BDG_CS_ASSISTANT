import { createFileRoute } from "@tanstack/react-router";
import DataPage from "@/components/DataPage";

export const Route = createFileRoute("/_admin/site-content")({
  component: () => (
    <DataPage
      resource="site-content"
      createLabel="New content key"
      columns={[
        { title: "Key", dataIndex: "key", width: 220 },
        { title: "Value", dataIndex: "value" },
        { title: "Type", dataIndex: "input_type", width: 110 },
        { title: "Updated", dataIndex: "updatedAt", width: 140 },
      ]}
      editableFields={[
        { name: "key", label: "Content key" },
        { name: "label", label: "Admin label" },
        { name: "value", label: "Value", type: "textarea" },
        {
          name: "input_type",
          label: "Input type",
          type: "select",
          options: ["text", "textarea", "url"],
        },
      ]}
    />
  ),
});
