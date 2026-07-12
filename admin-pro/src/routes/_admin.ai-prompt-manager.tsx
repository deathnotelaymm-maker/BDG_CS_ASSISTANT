import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Row, Col, Card, Tag, Button, Space, Drawer, Form, Input, InputNumber, Switch, message, Popconfirm, Skeleton, Alert } from "antd";
import { EditOutlined, CopyOutlined, ReloadOutlined, HistoryOutlined, PlusOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/ai-prompt-manager")({
  component: PromptManagerPage,
});

const DEFAULT_SECTIONS = [
  "Role",
  "Job",
  "Knowledge",
  "FAQ Prompt",
  "Example Answers",
  "Response Policy",
  "Language Rules",
  "Safety Rules",
  "Escalation Rules",
  "Image / Receipt Rules",
  "Smart Guide Rules",
  "Fallback Reply Rules",
  "Forbidden Actions",
];

function normalizePrompt(p: any, index = 0) {
  return {
    id: p.id ?? `new-${index}`,
    section_key: p.section_key || p.key || (p.title || p.name || "prompt").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    name: p.name || p.title || p.section_key || "Prompt Section",
    title: p.title || p.name || p.section_key || "Prompt Section",
    enabled: p.enabled !== false,
    priority: p.priority ?? index + 1,
    content: p.content || p.preview || "",
    preview: p.content || p.preview || "",
    updatedAt: p.updated_at || p.updatedAt || "",
  };
}

function PromptManagerPage() {
  const [sections, setSections] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = (await api.list("ai-prompts")) as any[];
      if (rows.length) setSections(rows.map(normalizePrompt));
      else {
        setSections(DEFAULT_SECTIONS.map((title, i) => normalizePrompt({ title, section_key: title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), content: "" }, i)));
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load prompt sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (s: any) => {
    setEditing(s);
    form.setFieldsValue({ ...s, content: s.content || s.preview });
  };

  const openCreate = () => {
    const section_key = `custom_${Date.now()}`;
    const s = normalizePrompt({ id: null, section_key, title: "Custom Prompt Section", content: "", enabled: true, priority: sections.length + 1 });
    setEditing(s);
    form.setFieldsValue(s);
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      section_key: v.section_key || editing.section_key,
      title: v.title || v.name,
      content: v.content || "",
      enabled: !!v.enabled,
      priority: Number(v.priority || 100),
    };
    try {
      const saved = editing.id && !String(editing.id).startsWith("new-")
        ? await api.update("ai-prompts", editing.id, payload)
        : await api.create("ai-prompts", payload);
      const normalized = normalizePrompt(saved);
      setSections((all) => {
        const exists = all.some((x) => x.id === editing.id);
        return exists ? all.map((x) => (x.id === editing.id ? normalized : x)) : [normalized, ...all];
      });
      setEditing(null);
      message.success("Prompt section saved");
    } catch (e: any) {
      message.error(e?.message || "Failed to save prompt");
    }
  };

  const duplicate = (s: any) => {
    const copy = normalizePrompt({ ...s, id: null, title: `${s.name} Copy`, section_key: `${s.section_key}_copy_${Date.now()}`, content: s.content || s.preview });
    setEditing(copy);
    form.setFieldsValue(copy);
  };

  const resetDefault = (s: any) => {
    form.setFieldsValue({ ...s, content: "" });
    message.info(`Edit and save "${s.name}" to reset its content.`);
  };

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

  return (
    <>
      <div className="bdg-filters" style={{ marginBottom: 12 }}>
        <div style={{ flex: 1, color: "#8ea0bd" }}>
          Manage the exact AI behavior sections used by DeepSeek and local safe fallback.
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New section</Button>
        <Button onClick={load}>Refresh</Button>
      </div>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

      <Row gutter={[12, 12]}>
        {sections.map((s) => (
          <Col xs={24} md={12} xl={8} key={s.id || s.section_key}>
            <Card
              className="bdg-card"
              size="small"
              title={
                <Space>
                  <span>{s.name}</span>
                  <Tag color={s.enabled ? "success" : "default"}>{s.enabled ? "Enabled" : "Disabled"}</Tag>
                  <Tag color="blue">P{s.priority}</Tag>
                </Space>
              }
              extra={<span style={{ color: "#8ea0bd", fontSize: 12 }}>{s.updatedAt}</span>}
            >
              <div style={{
                background: "var(--navy-700)", border: "1px solid var(--border-dim)",
                borderRadius: 6, padding: 10, color: "#c5d0e4", fontSize: 12,
                minHeight: 88, lineHeight: 1.5, marginBottom: 12, whiteSpace: "pre-wrap",
              }}>
                {(s.preview || s.content || "No prompt content yet. Click Edit to add instructions.").slice(0, 420)}
              </div>
              <Space wrap>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(s)}>Edit</Button>
                <Button size="small" icon={<CopyOutlined />} onClick={() => duplicate(s)}>Duplicate</Button>
                <Popconfirm title="Clear local form to default?" onConfirm={() => resetDefault(s)}>
                  <Button size="small" icon={<ReloadOutlined />}>Reset</Button>
                </Popconfirm>
                <Button size="small" icon={<HistoryOutlined />} href="/prompt-history">History</Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer
        title={editing ? `Edit prompt: ${editing.name}` : ""}
        open={!!editing}
        width={640}
        onClose={() => setEditing(null)}
        extra={<Space><Button onClick={() => setEditing(null)}>Cancel</Button><Button type="primary" onClick={save}>Save</Button></Space>}
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="Section key" name="section_key" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Section title" name="title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Enabled" name="enabled" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item label="Priority" name="priority"><InputNumber min={1} max={999} style={{ width: "100%" }} /></Form.Item>
          <Form.Item label="Prompt content" name="content"><Input.TextArea rows={14} /></Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
