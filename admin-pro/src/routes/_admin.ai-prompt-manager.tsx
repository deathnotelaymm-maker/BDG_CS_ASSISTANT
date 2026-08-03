import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
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
  "Visual Content Policy",
  "Forbidden Actions",
];

function sectionKey(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function normalizePrompt(p: any, index = 0) {
  const content = p.content || p.preview || "";
  return {
    id: p.id ?? `new-${index}`,
    section_key: p.section_key || p.key || sectionKey(p.title || p.name || "prompt"),
    name: p.name || p.title || p.section_key || "Prompt Section",
    title: p.title || p.name || p.section_key || "Prompt Section",
    enabled: p.enabled !== false,
    priority: p.priority ?? index + 1,
    content,
    preview: content,
    content_characters: Number(p.content_characters ?? content.length),
    updatedAt: p.updated_at || p.updatedAt || "",
  };
}

function PromptManagerPage() {
  const [sections, setSections] = useState<any[]>([]);
  const [runtimeData, setRuntimeData] = useState<any>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const draftContent = Form.useWatch("content", form) || "";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, runtime] = await Promise.all([
        api.list("ai-prompts") as Promise<any[]>,
        api.getPromptRuntime(),
      ]);
      setSections(
        rows.length
          ? rows.map(normalizePrompt)
          : DEFAULT_SECTIONS.map((title, i) =>
              normalizePrompt({ title, section_key: sectionKey(title), content: "" }, i),
            ),
      );
      setRuntimeData(runtime);
    } catch (e: any) {
      setError(e?.message || "Failed to load Prompt Manager runtime");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runtime = runtimeData?.runtime;
  const warningCount = runtime?.warnings?.filter((item: any) => item.severity === "warning").length || 0;
  const sectionRuntime = useMemo(
    () => new Map((runtime?.section_snapshot || []).map((item: any) => [Number(item.id), item])),
    [runtime],
  );

  const openEdit = (section: any) => {
    setEditing(section);
    form.setFieldsValue({ ...section, content: section.content || section.preview });
  };

  const openCreate = () => {
    const section = normalizePrompt({
      id: null,
      section_key: `custom_${Date.now()}`,
      title: "Custom Prompt Section",
      content: "",
      enabled: true,
      priority: sections.length + 1,
    });
    setEditing(section);
    form.setFieldsValue(section);
  };

  const save = async () => {
    const values = await form.validateFields();
    const payload = {
      section_key: values.section_key || editing.section_key,
      title: values.title || values.name,
      content: values.content || "",
      enabled: !!values.enabled,
      priority: Number(values.priority || 100),
    };
    setSaving(true);
    try {
      const saved =
        editing.id && !String(editing.id).startsWith("new-")
          ? await api.update("ai-prompts", editing.id, payload)
          : await api.create("ai-prompts", payload);
      setEditing(null);
      await load();
      message.success(
        `Prompt saved. Runtime v${saved?.prompt_runtime?.version_number || "latest"} is active.`,
      );
    } catch (e: any) {
      message.error(e?.message || "Failed to save prompt");
    } finally {
      setSaving(false);
    }
  };

  const duplicate = (section: any) => {
    const copy = normalizePrompt({
      ...section,
      id: null,
      title: `${section.name} Copy`,
      section_key: `${section.section_key}_copy_${Date.now()}`,
      content: section.content || section.preview,
    });
    setEditing(copy);
    form.setFieldsValue(copy);
  };

  const clearDraft = () => {
    form.setFieldValue("content", "");
    message.info("Draft content cleared. Nothing changes live until you save.");
  };

  const remove = async (section: any) => {
    if (!section.id || String(section.id).startsWith("new-")) {
      setSections((all) => all.filter((item) => item.id !== section.id));
      return;
    }
    try {
      const result = await api.remove("ai-prompts", section.id);
      await load();
      message.success(
        `Section deleted. Runtime v${result?.prompt_runtime?.version_number || "latest"} is active.`,
      );
    } catch (e: any) {
      message.error(e?.message || "Failed to delete prompt section");
    }
  };

  const rebuildRuntime = async () => {
    setSaving(true);
    try {
      const result = await api.rebuildPromptRuntime();
      await load();
      message.success(`Runtime v${result?.runtime?.version_number || "latest"} rebuilt and activated.`);
    } catch (e: any) {
      message.error(e?.message || "Failed to rebuild prompt runtime");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !runtimeData) return <Skeleton active paragraph={{ rows: 10 }} />;

  return (
    <>
      <Card className="bdg-card" size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <SafetyCertificateOutlined style={{ color: "#52c41a" }} />
              <Typography.Text strong>
                Active runtime v{runtime?.version_number || "—"}
              </Typography.Text>
              <Tag color="green">Published automatically</Tag>
              <Tag color={warningCount ? "warning" : "success"}>
                {warningCount ? `${warningCount} warning(s)` : "Validated"}
              </Tag>
            </Space>
            <Space wrap>
              <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)} disabled={!runtime}>
                Preview exact runtime
              </Button>
              <Button icon={<ReloadOutlined />} loading={saving} onClick={rebuildRuntime}>
                Rebuild runtime
              </Button>
            </Space>
          </Space>
          <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
            <Descriptions.Item label="Platform">
              {runtimeData?.platform?.name || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Route">
              /p/{runtimeData?.platform?.public_route_key || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Prompt hash">
              <Typography.Text copyable={{ text: runtime?.compiled_prompt_hash || "" }}>
                {runtime?.compiled_prompt_hash?.slice(0, 16) || "—"}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Compiled size">
              {runtime?.prompt_characters || 0} characters
            </Descriptions.Item>
          </Descriptions>
          <Alert
            type="info"
            showIcon
            message="Every save, delete, or history restore creates an immutable compiled runtime. Existing chat memory is cleared automatically when its prompt hash no longer matches."
          />
        </Space>
      </Card>

      <div className="bdg-filters" style={{ marginBottom: 12 }}>
        <div style={{ flex: 1, color: "#8ea0bd" }}>
          Sections are compiled by priority into one live system instruction. The cards below are not sent independently.
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New section
        </Button>
        <Button onClick={load}>Refresh</Button>
      </div>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      {!!runtime?.warnings?.length && (
        <Alert
          type={warningCount ? "warning" : "info"}
          showIcon
          message="Prompt compiler findings"
          description={
            <Space direction="vertical" size={2}>
              {runtime.warnings.slice(0, 8).map((item: any, index: number) => (
                <Typography.Text key={`${item.code}-${index}`}>{item.message}</Typography.Text>
              ))}
            </Space>
          }
          style={{ marginBottom: 12 }}
        />
      )}

      <Row gutter={[12, 12]}>
        {sections.map((section) => {
          const compiled = sectionRuntime.get(Number(section.id));
          return (
            <Col xs={24} md={12} xl={8} key={section.id || section.section_key}>
              <Card
                className="bdg-card"
                size="small"
                title={
                  <Space wrap>
                    <span>{section.name}</span>
                    <Tag color={section.enabled ? "success" : "default"}>
                      {section.enabled ? "Enabled" : "Disabled"}
                    </Tag>
                    <Tag color="blue">P{section.priority}</Tag>
                    {compiled?.clipped ? <Tag color="warning">Clipped</Tag> : null}
                  </Space>
                }
                extra={<span style={{ color: "#8ea0bd", fontSize: 12 }}>{section.updatedAt}</span>}
              >
                <div
                  style={{
                    background: "var(--navy-700)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: 6,
                    padding: 10,
                    color: "#c5d0e4",
                    fontSize: 12,
                    minHeight: 88,
                    lineHeight: 1.5,
                    marginBottom: 8,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {(section.preview || section.content || "No prompt content yet. Click Edit to add instructions.").slice(0, 420)}
                </div>
                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 10 }}>
                  {section.content_characters || 0} characters · Runtime hash: {compiled?.hash?.slice(0, 10) || "not included"}
                </Typography.Text>
                <Space wrap>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(section)}>
                    Edit
                  </Button>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => duplicate(section)}>
                    Duplicate
                  </Button>
                  <Button size="small" icon={<HistoryOutlined />} href="/prompt-history">
                    History
                  </Button>
                  <Popconfirm
                    title="Delete and activate a new runtime?"
                    description="The old compiled runtime remains in immutable history."
                    onConfirm={() => remove(section)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Drawer
        title={editing ? `Edit prompt: ${editing.name}` : ""}
        open={!!editing}
        width={680}
        onClose={() => setEditing(null)}
        extra={
          <Space>
            <Button onClick={clearDraft}>Clear draft</Button>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={save}>
              Save & activate runtime
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          message="Saving publishes a new immutable runtime immediately. Old chat memory using another hash is cleared on its next message."
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical" form={form}>
          <Form.Item label="Section key" name="section_key" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Section title" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space align="start" style={{ width: "100%" }}>
            <Form.Item label="Enabled" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Priority" name="priority">
              <InputNumber min={1} max={999} style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Form.Item
            label={`Prompt content (${draftContent.length} characters)`}
            name="content"
            extra="The compiler includes up to 6,000 characters per section and 24,000 characters in total. The preview shows exactly what is active."
          >
            <Input.TextArea rows={16} showCount maxLength={20000} />
          </Form.Item>
          {draftContent.length > 6000 ? (
            <Alert type="warning" showIcon message="This section will be clipped to 6,000 runtime characters." />
          ) : null}
        </Form>
      </Drawer>

      <Drawer
        title="Exact compiled Prompt Manager runtime"
        open={previewOpen}
        width={820}
        onClose={() => setPreviewOpen(false)}
      >
        <Descriptions size="small" bordered column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Active version">v{runtime?.version_number || "—"}</Descriptions.Item>
          <Descriptions.Item label="SHA-256">
            <Typography.Text copyable>{runtime?.compiled_prompt_hash || "—"}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Section IDs">
            {(runtime?.section_ids || []).join(", ") || "Safe fallback only"}
          </Descriptions.Item>
          <Descriptions.Item label="Created">{runtime?.created_at || "—"}</Descriptions.Item>
        </Descriptions>
        <Input.TextArea
          readOnly
          value={runtime?.compiled_prompt || ""}
          autoSize={{ minRows: 22, maxRows: 40 }}
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
        <Typography.Title level={5} style={{ marginTop: 18 }}>
          Runtime history
        </Typography.Title>
        <Space direction="vertical" style={{ width: "100%" }}>
          {(runtimeData?.versions || []).slice(0, 10).map((item: any) => (
            <Card key={item.id} size="small">
              <Space wrap>
                <Tag color={item.id === runtime?.id ? "green" : "default"}>v{item.version_number}</Tag>
                <Typography.Text code>{item.compiled_prompt_hash?.slice(0, 16)}</Typography.Text>
                <Typography.Text>{item.prompt_characters} chars</Typography.Text>
                <Typography.Text type="secondary">{item.change_note}</Typography.Text>
                <Typography.Text type="secondary">{item.created_at}</Typography.Text>
              </Space>
            </Card>
          ))}
        </Space>
      </Drawer>
    </>
  );
}
