import { createFileRoute } from "@tanstack/react-router";
import DataPage from "@/components/DataPage";
import { Tag } from "antd";

export const Route = createFileRoute("/_admin/chat-logs")({
  component: () => (
    <DataPage
      resource="chat-logs"
      createLabel="New session"
      columns={[
        { title: "User", dataIndex: "user", width: 160 },
        { title: "Messages", dataIndex: "messages", width: 120 },
        { title: "Resolved", dataIndex: "resolved", width: 120, render: (v) => <Tag color={v ? "success" : "warning"}>{v ? "Resolved" : "Open"}</Tag> },
        { title: "Started", dataIndex: "startedAt", width: 180 },
      ]}
      editableFields={[{ name: "user", label: "User" }]}
    />
  ),
});
