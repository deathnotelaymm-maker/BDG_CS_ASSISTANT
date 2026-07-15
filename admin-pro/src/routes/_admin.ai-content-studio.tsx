import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Upload,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import RichKnowledgeEditor from "@/components/RichKnowledgeEditor";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/ai-content-studio")({
  component: AiContentStudioPage,
});

const blankDocument = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

function AiContentStudioPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [richJson, setRichJson] = useState(blankDocument);
  const [richHtml, setRichHtml] = useState("");
  const [richJsonHi, setRichJsonHi] = useState(blankDocument);
  const [richHtmlHi, setRichHtmlHi] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [actionButtons, setActionButtons] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [testMessage, setTestMessage] = useState("hello");
  const [testLanguage, setTestLanguage] = useState("en");
  const [testPlatform, setTestPlatform] = useState("default");
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [items, buttons, platformRows] = await Promise.all([api.list("ai-content"), api.list("action-buttons"), api.listSupportPlatforms()]);
      setRows(items as any[]);
      setActionButtons(buttons as any[]);
      setPlatforms(platformRows as any[]);
    } catch (error: any) {
      message.error(error?.message || "Failed to load AI Content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEditor = (item?: any) => {
    const current = item || {
      title: "",
      intent_key: "",
      locale: "en",
      status: "draft",
      priority: 100,
      confidence_threshold: 86,
      image_delivery: "after_answer",
      version_label: "v1",
      approval_status: "draft",
      platform_scope: "all",
      route_policy: "answer_only",
    };
    setEditing(current);
    setRichJson(current.rich_json || blankDocument);
    setRichHtml(current.rich_html || "");
    setRichJsonHi(current.rich_json_hi || blankDocument);
    setRichHtmlHi(current.rich_html_hi || "");
    setImages(Array.isArray(current.image_urls) ? current.image_urls : []);
    form.setFieldsValue({ ...current, platform_scope: Array.isArray(current.platform_scope) ? current.platform_scope : String(current.platform_scope || "all").split(/[\s,|\n]+/).filter(Boolean) });
  };

  const closeEditor = () => {
    setEditing(null);
    form.resetFields();
    setImages([]);
    setRichJson(blankDocument);
    setRichHtml("");
    setRichJsonHi(blankDocument);
    setRichHtmlHi("");
  };

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = { ...values, rich_json: richJson, rich_html: richHtml, rich_json_hi: richJsonHi, rich_html_hi: richHtmlHi, image_urls: images };
      if (editing?.id) await api.update("ai-content", editing.id, payload);
      else await api.create("ai-content", payload);
      message.success(editing?.id ? "AI Content updated" : "AI Content created");
      closeEditor();
      await load();
    } catch (error: any) {
      message.error(error?.message || "Failed to save AI Content");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.remove("ai-content", id);
      message.success("AI Content deleted");
      await load();
    } catch (error: any) {
      message.error(error?.message || "Delete failed");
    }
  };

  const uploadImage = async (file: File) => (await api.upload(file)).url;

  const uploadResponseImage = async (file: File) => {
    try {
      const url = await uploadImage(file);
      setImages((all) => [...all, url]);
      message.success("Response image uploaded");
    } catch (error: any) {
      message.error(error?.message || "Upload failed");
    }
    return false;
  };

  const runTest = async () => {
    if (!testMessage.trim()) return;
    setTesting(true);
    try {
      setTestResult(await api.testAiContent(testMessage.trim(), testLanguage, testPlatform));
    } catch (error: any) {
      message.error(error?.message || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const columns = useMemo(() => [
    {
      title: "Content",
      key: "title",
      render: (_: any, item: any) => <div><strong>{item.title}</strong><div style={{ color: "#8ea0bd", fontSize: 12 }}>{item.intent_key}</div></div>,
    },
    { title: "Locale", dataIndex: "locale", width: 90, render: (value: string) => <Tag>{String(value || "en").toUpperCase()}</Tag> },
    { title: "Status", dataIndex: "status", width: 110, render: (value: string) => <Tag color={value === "published" ? "green" : value === "archived" ? "red" : "gold"}>{value}</Tag> },
    { title: "Approval", dataIndex: "approval_status", width: 110, render: (value: string) => <Tag color={value === "approved" ? "green" : "gold"}>{value || "draft"}</Tag> },
    { title: "Platform", dataIndex: "platform_scope", width: 120, render: (value: string) => <Tag color="blue">{value || "all"}</Tag> },
    { title: "Images", dataIndex: "image_urls", width: 80, render: (value: string[]) => Array.isArray(value) ? value.length : 0 },
    { title: "Updated", dataIndex: "updated_at", width: 190, render: (value: string) => value ? new Date(value).toLocaleString() : "—" },
    {
      title: "Actions",
      width: 150,
      render: (_: any, item: any) => <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openEditor(item)}>Edit</Button>
        <Popconfirm title="Delete this AI Content item?" description="It will be archived and removed from AI routing." onConfirm={() => remove(item.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>,
    },
  ], []);

  return (
    <>
      <Alert
        showIcon
        type="info"
        message="AI Knowledge Orchestrator"
        description="The AI Meaning Judge understands typos, broken English, Hindi, and Hinglish. It decides match, clarification, greeting, or no match from positive examples, negative examples, item instruction, and approved knowledge. Backend keyword scoring is disabled."
        style={{ marginBottom: 12 }}
      />

      <Card className="bdg-card" size="small" title="Routing safety test" style={{ marginBottom: 12 }}>
        <Space.Compact style={{ width: "100%" }}>
          <Select value={testLanguage} onChange={setTestLanguage} options={[{ value:"en",label:"English" },{ value:"hi",label:"Hindi / Indian" }]} style={{ width:150 }} />
          <Select value={testPlatform} onChange={setTestPlatform} options={platforms.filter((platform) => platform.status === "active").map((platform) => ({ value:platform.platform_key,label:platform.name }))} style={{ width:190 }} />
          <Input value={testMessage} onChange={(event) => setTestMessage(event.target.value)} onPressEnter={runTest} placeholder="Try: hello, deposit not received, account number" />
          <Button icon={<ExperimentOutlined />} type="primary" loading={testing} onClick={runTest}>Test</Button>
        </Space.Compact>
        {testResult && <div style={{ marginTop: 10 }}>
          <Tag color={testResult.ok ? "blue" : "red"}>Decision: {testResult.decision?.decision || "provider error"}</Tag>
          {testResult.selected_content && <Tag color="green">Selected: {testResult.selected_content.title}</Tag>}
          {testResult.platform && <Tag color="purple">Platform: {testResult.platform.name || testResult.platform.platform_key} · {testResult.platform.support_mode}</Tag>}
          {typeof testResult.decision?.confidence === "number" && <Tag>AI confidence: {testResult.decision.confidence}%</Tag>}
          {testResult.decision?.user_intent && <div style={{ marginTop:8, color:"#8ea0bd" }}>Understood: {testResult.decision.user_intent} → {testResult.decision.desired_outcome}</div>}
          {testResult.provider_error && <Alert style={{ marginTop:8 }} type="error" showIcon message={testResult.provider_error} />}
        </div>}
      </Card>

      <div className="bdg-filters" style={{ marginBottom: 12 }}>
        <div style={{ flex: 1, color: "#8ea0bd" }}>Create approved FAQ, knowledge, examples, visual content, and response images in one place.</div>
        <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>New AI Prompt & Image</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={rows} columns={columns as any} pagination={{ pageSize: 20 }} />

      <Drawer
        open={!!editing}
        onClose={closeEditor}
        width="min(1180px, 96vw)"
        title={editing?.id ? `Edit AI Prompt & Image — ${editing.title}` : "Create AI Prompt & Image"}
        extra={<Space><Button onClick={closeEditor}>Cancel</Button><Button type="primary" loading={saving} onClick={save}>Save</Button></Space>}
      >
        <Form form={form} layout="vertical">
          <Tabs items={[
            {
              key: "routing",
              label: "Prompt & routing",
              children: <>
                <Row gutter={12}>
                  <Col xs={24} md={12}><Form.Item name="title" label="Content title" rules={[{ required: true }]}><Input placeholder="Deposit not received" /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="intent_key" label="Intent key" rules={[{ required: true }]}><Input placeholder="deposit-not-received" /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="locale" label="Locale"><Select options={[{ value: "en", label: "English" }, { value: "hi", label: "Hindi" }, { value: "all", label: "All languages" }]} /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="status" label="Status"><Select options={["draft", "published", "archived"].map((value) => ({ value, label: value }))} /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="priority" label="Catalog order"><InputNumber min={1} max={999} style={{ width: "100%" }} /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="approval_status" label="Knowledge approval"><Select options={[{value:"draft",label:"Draft"},{value:"approved",label:"Approved"},{value:"archived",label:"Archived"}]} /></Form.Item></Col>
                </Row>
                <Row gutter={12}>
                  <Col xs={24} md={12}><Form.Item name="platform_scope" label="Available on support platforms"><Select mode="multiple" optionFilterProp="label" options={[{ value:"all", label:"All active platforms" }, ...platforms.filter((platform) => platform.status === "active").map((platform) => ({ value:platform.platform_key,label:`${platform.name} (${platform.support_mode})` }))]} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="route_policy" label="Action policy"><Select options={[{ value:"answer_only",label:"Answer only" },{ value:"action_optional",label:"Optional approved action" },{ value:"ticket_optional",label:"Ticket action when platform supports it" },{ value:"ticket_required",label:"Ticket action only when supported" },{ value:"human_escalation",label:"Escalate to configured support" }]} /></Form.Item></Col>
                </Row>
                {editing?.import_batch_id && <Alert showIcon type="info" message={`Imported draft · batch ${editing.import_batch_id}`} description={`Source: ${editing.source_sheet || "workbook"}${editing.source_row ? ` row ${editing.source_row}` : ""}. Ticket and image references are review notes; connect only approved buttons and uploaded images.`} style={{ marginBottom:12 }} />}
                <Row gutter={12}>
                  <Col xs={24} md={12}><Form.Item name="positive_examples" label="Positive examples — should match"><Input.TextArea rows={5} placeholder={"My deposit has not arrived\nMoney was deducted but balance was not added"} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="negative_examples" label="Negative examples — must not match"><Input.TextArea rows={5} placeholder={"How do I deposit?\nWithdrawal not received\nHello"} /></Form.Item></Col>
                </Row>
                <Form.Item name="required_fields" label="Required information"><Input.TextArea rows={3} placeholder={"payment method\nwaiting time"} /></Form.Item>
                <Row gutter={12}>
                  <Col xs={24} md={12}><Form.Item name="ai_instruction" label="English item-specific AI instruction"><Input.TextArea rows={5} placeholder="Ask for the missing details first. Never promise a balance adjustment." /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="ai_instruction_hi" label="Hindi / Indian item-specific AI instruction"><Input.TextArea rows={5} placeholder="Hindi/Hinglish handling instructions" /></Form.Item></Col>
                </Row>
              </>,
            },
            {
              key: "knowledge",
              label: "FAQ & knowledge",
              children: <>
                <Row gutter={12}>
                  <Col xs={24} md={8}><Form.Item name="faq_content" label="Approved FAQ"><Input.TextArea rows={8} /></Form.Item></Col>
                  <Col xs={24} md={8}><Form.Item name="knowledge_content" label="Approved knowledge"><Input.TextArea rows={8} /></Form.Item></Col>
                  <Col xs={24} md={8}><Form.Item name="example_answers" label="English example answers / output style"><Input.TextArea rows={8} /></Form.Item></Col>
                </Row>
                <Form.Item name="example_answers_hi" label="Hindi / Indian example answers / output style"><Input.TextArea rows={6} /></Form.Item>
              </>,
            },
            {
              key: "visual",
              label: "English Visual Knowledge",
              children: <RichKnowledgeEditor value={richJson} onChange={(json, html) => { setRichJson(json); setRichHtml(html); }} uploadImage={uploadImage} />,
            },
            {
              key: "visual-hi",
              label: "Hindi / Indian Visual Knowledge",
              children: <RichKnowledgeEditor value={richJsonHi} onChange={(json, html) => { setRichJsonHi(json); setRichHtmlHi(html); }} uploadImage={uploadImage} />,
            },
            {
              key: "buttons",
              label: "Recommended buttons",
              children: <>
                <Alert showIcon type="info" style={{ marginBottom:12 }} message="The AI may recommend only buttons assigned here. It decides whether each button is relevant to the customer request." />
                <Form.Item name="button_ids" label="Approved buttons">
                  <Select mode="multiple" optionFilterProp="label" placeholder="Choose reusable buttons" options={actionButtons.filter((button) => button.status === "active").map((button) => ({ value:button.id,label:`${button.label} — ${button.action_type}` }))} />
                </Form.Item>
              </>,
            },
            {
              key: "images",
              label: `Response images (${images.length})`,
              children: <>
                <Alert type="warning" showIcon message="The AI chooses whether and where each approved image belongs. Images never cause a topic match." style={{ marginBottom: 12 }} />
                <Row gutter={12}>
                  <Col xs={24} md={8}><Form.Item name="image_delivery" label="Image delivery"><Select options={[{ value: "after_answer", label: "After the text answer" }, { value: "never", label: "Never send automatically" }]} /></Form.Item></Col>
                  <Col xs={24} md={8}><Form.Item name="version_label" label="Knowledge version"><Input placeholder="v1" /></Form.Item></Col>
                  <Col xs={24} md={8} style={{ paddingTop: 30 }}><Upload showUploadList={false} beforeUpload={uploadResponseImage} accept="image/png,image/jpeg,image/webp,image/gif"><Button icon={<UploadOutlined />}>Upload response image</Button></Upload></Col>
                </Row>
                <Image.PreviewGroup>
                  <Space wrap size={12}>
                    {images.map((url) => <Card key={url} size="small" cover={<Image src={url} width={180} height={120} style={{ objectFit: "cover" }} />} actions={[<DeleteOutlined key="delete" onClick={() => setImages((all) => all.filter((item) => item !== url))} />]}><Card.Meta description={url.split("/").pop()} /></Card>)}
                  </Space>
                </Image.PreviewGroup>
              </>,
            },
          ]} />
        </Form>
      </Drawer>
    </>
  );
}
