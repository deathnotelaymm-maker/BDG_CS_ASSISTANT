import { createFileRoute } from "@tanstack/react-router";
import { Alert } from "antd";
import DataPage from "@/components/DataPage";

export const Route = createFileRoute("/_admin/site-content")({
  component: () => (
    <>
      <Alert
        showIcon
        type="info"
        message="Guide Page content is connected live"
        description="Saving a content key publishes it through the Render API. Refresh or return to the Guide Page to see the latest value; a Cloudflare rebuild is not required."
        style={{ marginBottom: 12 }}
      />
      <DataPage
        resource="site-content"
        createLabel="New content key"
        columns={[
          { title: "Key", dataIndex: "key", width: 220 },
          { title: "Value", dataIndex: "value" },
          { title: "Type", dataIndex: "input_type", width: 110 },
          { title: "Updated", dataIndex: "updatedAt", width: 180 },
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
    </>
  ),
});
