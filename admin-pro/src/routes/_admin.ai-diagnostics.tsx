import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Row, Col, Card, Tag, Input, Button, Space, Skeleton, Statistic, Alert, Table, Typography } from "antd";
import { CheckCircleFilled, CloseCircleFilled, SendOutlined, ReloadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/ai-diagnostics")({ component: DiagnosticsPage });

function Bool({ v }: { v: boolean }) {
  return v ? <Tag color="success" icon={<CheckCircleFilled />}>Yes</Tag> : <Tag color="error" icon={<CloseCircleFilled />}>No</Tag>;
}

function DiagnosticsPage() {
  const [d, setD] = useState<any>(null);
  const [apiDiag, setApiDiag] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [reply, setReply] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.getDiagnostics().then(setD);
    api.getAdminApiDiagnostics().then(setApiDiag).catch((e: any) => setApiDiag({ ok: false, checks: [], error: e?.message }));
  };
  useEffect(() => { load(); }, []);
  if (!d) return <Skeleton active paragraph={{ rows: 8 }} />;

  const runTest = async () => {
    setLoading(true);
    try { setReply(await api.testAI(msg || "What services can you help me with?")); }
    finally { setLoading(false); }
  };

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={14}>
        <Card className="bdg-card" title="System Diagnostics" size="small" extra={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Refresh</Button>}>
          <Row gutter={[16, 16]}>
            <Col xs={12}><div style={{ color: "#8ea0bd", fontSize: 12 }}>DEEPSEEK KEY PRESENT</div><Bool v={d.deepSeekKeyPresent} /></Col>
            <Col xs={12}><div style={{ color: "#8ea0bd", fontSize: 12 }}>AI ENABLED</div><Bool v={d.aiEnabled} /></Col>
            <Col xs={12}><div style={{ color: "#8ea0bd", fontSize: 12 }}>DEEPSEEK ENABLED</div><Bool v={d.deepSeekEnabled} /></Col>
            <Col xs={12}><Statistic title="Prompt count" value={d.promptCount} /></Col>
            <Col xs={12}><Statistic title="Prompt runtime" value={d.prompt_runtime?.version_number || 0} prefix="v" /></Col>
            <Col xs={12}><Statistic title="Compiled prompt" value={d.prompt_runtime?.prompt_characters || 0} suffix="chars" /></Col>
            <Col xs={12}><Statistic title="FAQ count" value={d.faqCount} /></Col>
            <Col xs={12}><Statistic title="Guide count" value={d.guideCount} /></Col>
            <Col xs={12}><Statistic title="Knowledge imports" value={d.counts?.knowledge_import_batches || 0} /></Col>
            <Col xs={12}><Statistic title="Support platforms" value={d.counts?.support_platforms || 0} /></Col>
            <Col xs={12}><Statistic title="Response time" value={d.responseTimeMs} suffix="ms" /></Col>
            <Col xs={24}><Alert type={d.recentErrors?.length ? "warning" : "success"} showIcon message="Latest AI diagnostic" description={d.lastApiError} /></Col>
          </Row>
        </Card>
      </Col>

      <Col xs={24} lg={10}>
        <Card className="bdg-card" title="Test AI Reply" size="small">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input.TextArea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a test question for the assistant..." />
            <Button type="primary" icon={<SendOutlined />} onClick={runTest} loading={loading}>Send test</Button>
            {reply && <div style={{ background: "var(--navy-700)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: 12, color: "#c5d0e4" }}>
              <div style={{ color: "#8ea0bd", fontSize: 11, marginBottom: 6 }}>FRESH TEST SESSION · {reply.latencyMs} ms</div>
              <Typography.Paragraph style={{ color: "#c5d0e4" }}>{reply.reply}</Typography.Paragraph>
              <Space wrap>
                <Tag color="green">Runtime v{reply.diagnostics?.prompt_runtime?.version_number || reply.prompt_runtime?.version_number || "—"}</Tag>
                <Tag>Hash {(reply.diagnostics?.prompt_runtime?.hash || reply.prompt_runtime?.hash || "").slice(0, 12) || "—"}</Tag>
                <Tag>{reply.diagnostics?.prompt_sections_used ?? "—"} sections</Tag>
                <Tag>{reply.diagnostics?.prompt_runtime?.prompt_characters || reply.prompt_runtime?.prompt_characters || 0} chars</Tag>
                <Tag color={reply.diagnostics?.memory_reset?.reset ? "warning" : "blue"}>Fresh memory</Tag>
              </Space>
            </div>}
          </Space>
        </Card>
      </Col>

      <Col xs={24}>
        <Card className="bdg-card" title="Recent AI Errors & Fallbacks" size="small">
          <Table rowKey={(r:any)=>r.id || r.request_id || r.error_type} className="bdg-table" size="small" dataSource={d.recentErrors || []} pagination={{pageSize:10}} columns={[
            {title:"Time",dataIndex:"created_at",width:190},
            {title:"Result",render:(_:any,r:any)=><Tag color={r.response_status === "degraded" ? "warning" : r.provider_status === "error" ? "error" : "success"}>{r.response_status || r.provider_status || r.error_type || "unknown"}</Tag>},
            {title:"Resolution path",dataIndex:"resolution_path",render:(v:string)=>v || "—"},
            {title:"Attempts",dataIndex:"provider_attempts",render:(v:number)=>Number(v || 0)},
            {title:"Member asked",dataIndex:"customer_message",ellipsis:true},
            {title:"Intent",dataIndex:"intent_id",render:(v:string)=>v || "—"},
            {title:"Platform",dataIndex:"platform_key",render:(v:string)=>v || "default"},
            {title:"Import",dataIndex:"import_batch_id",render:(v:number)=>v || "—"},
            {title:"Confidence",dataIndex:"confidence",render:(v:number)=>v == null ? "—" : `${v}%`},
            {title:"Reason",render:(_:any,r:any)=><Typography.Text copyable={{text:r.degraded_reason || r.error_type || r.error_detail || ""}}>{r.degraded_reason || r.error_type || r.error_detail || "—"}</Typography.Text>},
            {title:"Request ID",dataIndex:"request_id",ellipsis:true,render:(v:string)=><Typography.Text copyable>{v || "—"}</Typography.Text>},
          ]}/>
        </Card>
      </Col>

      <Col xs={24}>
        <Card className="bdg-card" title="Admin API Diagnostics" size="small">
          {apiDiag?.error && <Alert type="error" showIcon message={apiDiag.error} style={{ marginBottom: 12 }} />}
          <Table
            rowKey={(r: any) => r.name}
            className="bdg-table"
            size="small"
            dataSource={apiDiag?.checks || []}
            pagination={false}
            columns={[
              { title: "Check", dataIndex: "name" },
              { title: "Endpoint", dataIndex: "endpoint" },
              { title: "Status", render: (_: any, r: any) => r.ok ? <Tag color="success">Working</Tag> : <Tag color="error">Failed</Tag> },
              { title: "Time", dataIndex: "ms", render: (v: number) => `${v || 0} ms` },
              { title: "Detail", render: (_: any, r: any) => r.error || String(r.detail ?? "") },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}
