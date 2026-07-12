import { createFileRoute } from "@tanstack/react-router";
import DataPage from "@/components/DataPage";
import { Tag } from "antd";

export const Route = createFileRoute("/_admin/prompt-history")({
  component: () => (
    <DataPage
      resource="prompt-history"
      createLabel="New snapshot"
      columns={[
        { title: "Section", dataIndex: "section" },
        { title: "Version", dataIndex: "version", width: 100, render: (v) => <Tag color="blue">v{v}</Tag> },
        { title: "Editor", dataIndex: "editor", width: 200 },
        { title: "Changed", dataIndex: "changedAt", width: 180 },
      ]}
      editableFields={[{ name: "section", label: "Section" }]}
    />
  ),
});
