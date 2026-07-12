import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Popconfirm, Space, Table, Tag, message } from "antd";
import { DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/unmatched-questions")({ component: UnmatchedQuestionsPage });

type RowType = { id: number; session_id: string; customer_message: string; language: string; suggested_intent: string; created_at: string };

function UnmatchedQuestionsPage() {
  const [rows, setRows] = useState<RowType[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { setRows((await api.list("unmatched-questions")) as RowType[]); }
    catch (e: any) { message.error(e?.message || "Failed to load unmatched questions"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const columns: ColumnsType<RowType> = [
    { title: "Message", dataIndex: "customer_message", render: (v, r) => <div><b>{v}</b><div style={{ color: "#8ea0bd", fontSize: 12 }}>Session: {r.session_id || "-"}</div></div> },
    { title: "Language", dataIndex: "language", width: 110, render: (v) => <Tag>{v || "en"}</Tag> },
    { title: "Suggested intent", dataIndex: "suggested_intent", width: 220, render: (v) => <span style={{ color: "#8ea0bd" }}>{v || "no-smart-match"}</span> },
    { title: "Created", dataIndex: "created_at", width: 210 },
    { title: "Actions", width: 120, render: (_, row) => <Popconfirm title="Delete this unmatched log?" onConfirm={() => api.remove("unmatched-questions", row.id).then(load)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> },
  ];
  return <>
    <div className="bdg-filters">
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0 }}>Unmatched Questions</h2>
        <div style={{ color: "#8ea0bd", fontSize: 12 }}>Messages where Prompt-First AI could not confidently answer or decide whether a guide attachment was useful. Use these to improve AI Prompt Manager and Guide Attachment rules.</div>
      </div>
      <Space><Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button></Space>
    </div>
    <Table className="bdg-table" rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 20 }} />
  </>;
}
