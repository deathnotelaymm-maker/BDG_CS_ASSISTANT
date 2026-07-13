import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/chat-logs")({ component: ChatLogsPage });

function ChatLogsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await api.list("chat-logs"));
    } catch (e: any) {
      setError(e?.message || "Unable to load chat logs");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const matchesText =
          !search.trim() || JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase());
        const matchesStatus = !status || row.provider_status === status;
        return matchesText && matchesStatus;
      }),
    [rows, search, status],
  );

  return (
    <Card
      className="bdg-card"
      title="Chat Logs"
      extra={
        <Button icon={<ReloadOutlined />} onClick={load}>
          Refresh
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          allowClear
          placeholder="Search session, message, reply, model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 340 }}
        />
        <Select
          allowClear
          placeholder="Provider result"
          value={status}
          onChange={setStatus}
          style={{ width: 180 }}
          options={[
            { value: "success", label: "AI success" },
            { value: "fallback", label: "Fallback" },
            { value: "error", label: "Error" },
          ]}
        />
        <Tag>{filtered.length} log(s)</Tag>
      </Space>
      {error && (
        <Alert
          showIcon
          type="error"
          message="Chat logs could not be loaded"
          description={error}
          style={{ marginBottom: 16 }}
        />
      )}
      {loading ? (
        <Spin />
      ) : !filtered.length ? (
        <Empty description="No chat logs found" />
      ) : (
        <Collapse
          items={filtered.map((row) => ({
            key: row.id,
            label: (
              <Space wrap>
                <Tag color="blue">User asked</Tag>
                <Typography.Text
                  strong
                  style={{ maxWidth: 560 }}
                  ellipsis={{ tooltip: row.customer_message }}
                >
                  {row.customer_message || "No customer message recorded"}
                </Typography.Text>
                <Tag
                  color={
                    row.provider_status === "success"
                      ? "success"
                      : row.provider_status === "error"
                        ? "error"
                        : "warning"
                  }
                >
                  {row.provider_status}
                </Tag>
                <Typography.Text type="secondary">{row.created_at}</Typography.Text>
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <div>
                  <Typography.Text type="secondary">Customer asked</Typography.Text>
                  <Typography.Paragraph copyable style={{ fontSize: 16, marginTop: 4 }}>
                    {row.customer_message || "No customer message recorded"}
                  </Typography.Paragraph>
                </div>
                <div>
                  <Typography.Text type="secondary">Assistant</Typography.Text>
                  <Typography.Paragraph copyable>{row.assistant_reply}</Typography.Paragraph>
                </div>
                {row.error_type && (
                  <Alert
                    showIcon
                    type="warning"
                    message={row.error_type}
                    description={row.error_detail || undefined}
                  />
                )}
                <Typography.Text type="secondary">
                  Session: {row.session_id || "—"} · Model: {row.model || "local"} · Intent:{" "}
                  {row.intent_id || "—"} · Confidence: {row.confidence ?? "—"} · Attachment:{" "}
                  {row.attachment_decision || "none"} · Latency: {row.latency_ms || 0} ms · Request:{" "}
                  {row.request_id || "—"}
                </Typography.Text>
                {!!row.response_blocks?.length && (
                  <Typography.Text type="secondary">
                    Rich response: {row.response_format || "structured-v1"} ·{" "}
                    {row.response_blocks.length} block(s) · Resolution:{" "}
                    {row.resolution_state || "open"}
                  </Typography.Text>
                )}
                {!!row.matched_sources?.length && (
                  <Typography.Paragraph>
                    <b>Sources:</b> {row.matched_sources.join(", ")}
                  </Typography.Paragraph>
                )}
                {!!row.matched_images?.length && (
                  <Typography.Paragraph>
                    <b>Images:</b> {row.matched_images.join(", ")}
                  </Typography.Paragraph>
                )}
              </Space>
            ),
          }))}
        />
      )}
    </Card>
  );
}
