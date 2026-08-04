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
  Select,
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
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/ai-prompt-manager")({
  component: PromptManagerPage,
});

type PromptRuntimeSectionSnapshot = {
  id: number;
  section_key: string;
  title: string;
  content: string;
  priority: number;
  clipped: boolean;
  hash: string;
};

type ProductionSettings = {
  enabled: boolean;
  model: string;
  temperature: number;
  max_tokens: number;
  memory_enabled: boolean;
  memory_max_messages: number;
  memory_ttl_days: number;
  has_api_key: boolean;
  max_retries: number;
  provider_timeout_ms: number;
  fallback_mode: string;
  handoff_url: string;
};

const STANDARD_SECTIONS = [
  { title: "Platform Identity", section_key: "platform_identity" },
  { title: "Assistant Role", section_key: "assistant_role" },
  { title: "Job and Allowed Scope", section_key: "job_and_allowed_scope" },
  { title: "Approved Factual Boundaries", section_key: "approved_factual_boundaries" },
  { title: "Language Policy", section_key: "language_policy" },
  { title: "Response Style", section_key: "response_style" },
  { title: "Output Contract", section_key: "output_contract" },
  { title: "Safety Rules", section_key: "safety_rules" },
  { title: "Escalation", section_key: "escalation" },
  { title: "Forbidden Actions", section_key: "forbidden_actions" },
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

function mergeStandardSections(rows: any[]) {
  const normalized = rows.map(normalizePrompt);
  const existingKeys = new Set(normalized.map((row) => row.section_key));
  const missing = STANDARD_SECTIONS
    .filter((section) => !existingKeys.has(section.section_key))
    .map((section, index) =>
      normalizePrompt(
        {
          ...section,
          id: `new-standard-${section.section_key}`,
          content: "",
          enabled: true,
          priority: STANDARD_SECTIONS.findIndex((item) => item.section_key === section.section_key) + 1,
        },
        normalized.length + index,
      ),
    );
  return [...normalized, ...missing].sort((a, b) => Number(a.priority) - Number(b.priority));
}

function normalizeProductionSettings(aiPayload: any, reliabilityPayload: any): ProductionSettings {
  const aiSettings = aiPayload?.settings || aiPayload || {};
  const reliability = reliabilityPayload?.settings || reliabilityPayload || {};
  return {
    enabled: aiSettings.enabled !== false,
    model: aiSettings.model || "deepseek-v4-flash",
    temperature: Number(aiSettings.temperature ?? 0.2),
    max_tokens: Number(aiSettings.max_tokens ?? 1200),
    memory_enabled: aiSettings.memory_enabled !== false,
    memory_max_messages: Number(aiSettings.memory_max_messages ?? 12),
    memory_ttl_days: Number(aiSettings.memory_ttl_days ?? 30),
    has_api_key: !!aiSettings.has_api_key,
    max_retries: Number(reliability.max_retries ?? 2),
    provider_timeout_ms: Number(reliability.provider_timeout_ms ?? reliability.timeout_ms ?? 12000),
    fallback_mode: reliability.fallback_mode || "clarify_then_human",
    handoff_url: reliability.handoff_url || "",
  };
}

function PromptManagerPage() {
  const [sections, setSections] = useState<any[]>([]);
  const [runtimeData, setRuntimeData] = useState<any>(null);
  const [production, setProduction] = useState<ProductionSettings | null>(null);
  const [handoff, setHandoff] = useState<any>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const draftContent = Form.useWatch("content", form) || "";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, runtime, aiSettings, reliability, handoffSettings] = await Promise.all([
        api.list("ai-prompts") as Promise<any[]>, api.getPromptRuntime(), api.getAiSettings(), api.getAiReliability(), api.getSupportSettings(),
      ]);
      setSections(mergeStandardSections(rows));
      setRuntimeData(runtime);
      setProduction(normalizeProductionSettings(aiSettings, reliability));
      setHandoff(handoffSettings);
    } catch (e: any) {
      setError(e?.message || "Failed to load Assistant Setup");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runtime = runtimeData?.runtime;
  const warningCount = runtime?.warnings?.filter((item: any) => item.severity === "warning").length || 0;
  const sectionRuntime = useMemo(() => {
    const snapshot: PromptRuntimeSectionSnapshot[] = Array.isArray(runtime?.section_snapshot)
      ? runtime.section_snapshot
      : [];
    return new Map<number, PromptRuntimeSectionSnapshot>(
      snapshot.map((item) => [Number(item.id), item]),
    );
  }, [runtime]);

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

  const saveProductionSettings = async () => {
    if (!production) return;
    setSettingsSaving(true);
    try {
      const [aiSettings, reliability] = await Promise.all([
        api.updateAiSettings({
          enabled: production.enabled,
          model: production.model,
          temperature: production.temperature,
          max_tokens: production.max_tokens,
          memory_enabled: production.memory_enabled,
          memory_max_messages: production.memory_max_messages,
          memory_ttl_days: production.memory_ttl_days,
          require_approved_context: false,
        }),
        api.updateAiReliability({
          enabled: true,
          workflow_mode: "prompt_first",
          max_retries: production.max_retries,
          provider_timeout_ms: production.provider_timeout_ms,
          fallback_mode: production.fallback_mode,
          handoff_url: production.handoff_url,
        }),
      ]);
      setProduction(normalizeProductionSettings(aiSettings, reliability));
      message.success("Production AI settings saved. The one-call Assistant Setup workflow remains active.");
    } catch (e: any) {
      message.error(e?.message || "Failed to save production AI settings");
    } finally {
      setSettingsSaving(false);
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
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 12 }}>
        Assistant Setup
      </Typography.Title>

      <Alert
        type="success"
        showIcon
        message="Simplified production runtime"
        description="One compiled Assistant Setup prompt controls behavior. Only approved Menu & Images items may provide business facts or media. General questions may be answered naturally without an approved menu match. Message language is detected automatically."
        style={{ marginBottom: 12 }}
      />

      <Card className="bdg-card" size="small" title="Production AI settings" style={{ marginBottom: 12 }}>
        {production ? (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={8} lg={5}>
                <Typography.Text type="secondary">AI enabled</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Switch
                    checked={production.enabled}
                    onChange={(enabled) => setProduction({ ...production, enabled })}
                  />
                </div>
              </Col>
              <Col xs={24} sm={8} lg={5}>
                <Typography.Text type="secondary">Conversation memory</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Switch
                    checked={production.memory_enabled}
                    onChange={(memory_enabled) => setProduction({ ...production, memory_enabled })}
                  />
                </div>
              </Col>
              <Col xs={24} sm={8} lg={5}>
                <Typography.Text type="secondary">Provider key</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color={production.has_api_key ? "success" : "error"}>
                    {production.has_api_key ? "Configured" : "Missing"}
                  </Tag>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={9}>
                <Typography.Text type="secondary">Runtime architecture</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color="blue">One DeepSeek call</Tag>
                  <Tag color="purple">Menu & Images only</Tag>
                  <Tag color="green">General answers allowed</Tag>
                </div>
              </Col>
            </Row>

            <Row gutter={[12, 12]}>
              <Col xs={24} md={12} lg={6}>
                <Typography.Text type="secondary">Model</Typography.Text>
                <Input
                  value={production.model}
                  onChange={(event) => setProduction({ ...production, model: event.target.value })}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={12} md={6} lg={4}>
                <Typography.Text type="secondary">Temperature</Typography.Text>
                <InputNumber
                  min={0}
                  max={1.5}
                  step={0.1}
                  value={production.temperature}
                  onChange={(temperature) => setProduction({ ...production, temperature: Number(temperature ?? 0.2) })}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
              <Col xs={12} md={6} lg={4}>
                <Typography.Text type="secondary">Max tokens</Typography.Text>
                <InputNumber
                  min={200}
                  max={8000}
                  value={production.max_tokens}
                  onChange={(max_tokens) => setProduction({ ...production, max_tokens: Number(max_tokens ?? 1200) })}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
              <Col xs={12} md={6} lg={4}>
                <Typography.Text type="secondary">Retries</Typography.Text>
                <InputNumber
                  min={0}
                  max={5}
                  value={production.max_retries}
                  onChange={(max_retries) => setProduction({ ...production, max_retries: Number(max_retries ?? 2) })}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
              <Col xs={12} md={6} lg={6}>
                <Typography.Text type="secondary">Provider timeout (ms)</Typography.Text>
                <InputNumber
                  min={3000}
                  max={30000}
                  step={1000}
                  value={production.provider_timeout_ms}
                  onChange={(provider_timeout_ms) => setProduction({ ...production, provider_timeout_ms: Number(provider_timeout_ms ?? 12000) })}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
            </Row>

            <Row gutter={[12, 12]}>
              <Col xs={12} md={6}>
                <Typography.Text type="secondary">Memory messages</Typography.Text>
                <InputNumber
                  min={4}
                  max={50}
                  value={production.memory_max_messages}
                  onChange={(memory_max_messages) => setProduction({ ...production, memory_max_messages: Number(memory_max_messages ?? 12) })}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
              <Col xs={12} md={6}>
                <Typography.Text type="secondary">Memory retention (days)</Typography.Text>
                <InputNumber
                  min={1}
                  max={365}
                  value={production.memory_ttl_days}
                  onChange={(memory_ttl_days) => setProduction({ ...production, memory_ttl_days: Number(memory_ttl_days ?? 30) })}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={6}>
                <Typography.Text type="secondary">Fallback behavior</Typography.Text>
                <Select
                  value={production.fallback_mode}
                  onChange={(fallback_mode) => setProduction({ ...production, fallback_mode })}
                  options={[
                    { value: "clarify_then_human", label: "Clarify, then human" },
                    { value: "clarify_only", label: "Clarify only" },
                    { value: "human_only", label: "Human handoff" },
                  ]}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={6}>
                <Typography.Text type="secondary">Human handoff URL</Typography.Text>
                <Input
                  value={production.handoff_url}
                  onChange={(event) => setProduction({ ...production, handoff_url: event.target.value })}
                  placeholder="https://..."
                  style={{ marginTop: 6 }}
                />
              </Col>
            </Row>

            <Space wrap>
              <Button type="primary" icon={<SaveOutlined />} loading={settingsSaving} onClick={saveProductionSettings}>
                Save production settings
              </Button>
              <Typography.Text type="secondary">
                Approved-source blocking and advanced two-stage routing are permanently disabled in this runtime.
              </Typography.Text>
            </Space>
          </Space>
        ) : (
          <Alert type="warning" showIcon message="Production settings could not be loaded." />
        )}
      </Card>

      <Card className="bdg-card" size="small" title="Advanced Controls · Human Customer Service Handoff" style={{ marginBottom: 12 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={7}><Typography.Text type="secondary">Enable human handoff</Typography.Text><div style={{marginTop:8}}><Switch checked={!!handoff?.human_support_enabled} onChange={(value)=>setHandoff({...handoff,human_support_enabled:value})}/></div></Col>
          <Col xs={24} md={9}><Typography.Text type="secondary">Button text</Typography.Text><Input style={{marginTop:6}} value={handoff?.handoff_button_text||"Contact Customer Service"} onChange={(event)=>setHandoff({...handoff,handoff_button_text:event.target.value})}/></Col>
          <Col xs={24} md={4}><Typography.Text type="secondary">Clarification attempts</Typography.Text><InputNumber min={0} max={10} style={{width:"100%",marginTop:6}} value={handoff?.maximum_clarification_attempts??2} onChange={(value)=>setHandoff({...handoff,maximum_clarification_attempts:Number(value??2)})}/></Col>
          <Col xs={24} md={4}><Button type="primary" style={{marginTop:24}} onClick={async()=>{await api.updateSupportSettings(handoff);message.success("Human handoff settings saved")}}>Save handoff</Button></Col>
        </Row>
        <Typography.Text type="secondary">Detailed queue, staff, timezone, and message settings are available in Customer Service.</Typography.Text>
      </Card>

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
            message="Every prompt change creates an immutable compiled runtime. Existing chat memory is cleared automatically when its prompt hash no longer matches. Runtime history remains available inside the exact-runtime preview."
          />
        </Space>
      </Card>

      <div className="bdg-filters" style={{ marginBottom: 12 }}>
        <div style={{ flex: 1, color: "#8ea0bd" }}>
          The ten standard sections below compile by priority into one live instruction. Missing standard sections are shown as empty cards so they can be created directly.
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New custom section
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
          const isUnsavedStandard = String(section.id).startsWith("new-standard-");
          return (
            <Col xs={24} md={12} xl={8} key={section.id || section.section_key}>
              <Card
                className="bdg-card"
                size="small"
                title={
                  <Space wrap>
                    <span>{section.name}</span>
                    <Tag color={isUnsavedStandard ? "warning" : section.enabled ? "success" : "default"}>
                      {isUnsavedStandard ? "Not created" : section.enabled ? "Enabled" : "Disabled"}
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
                    {isUnsavedStandard ? "Create" : "Edit"}
                  </Button>
                  {!isUnsavedStandard ? (
                    <Button size="small" icon={<CopyOutlined />} onClick={() => duplicate(section)}>
                      Duplicate
                    </Button>
                  ) : null}
                  <Popconfirm
                    title="Delete and activate a new runtime?"
                    description="The old compiled runtime remains in immutable history."
                    onConfirm={() => remove(section)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} disabled={isUnsavedStandard}>
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
        title="Exact compiled Assistant Setup runtime"
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
