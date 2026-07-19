import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Upload, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import RichKnowledgeEditor from "@/components/RichKnowledgeEditor";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/ai-qa")({ component: AiQaPage });
const blankDoc = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

function AiQaPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localeOptions, setLocaleOptions] = useState<{ value: string; label: string }[]>([{ value: "en", label: "EN — English" }]);
  const [answerJson, setAnswerJson] = useState(blankDoc);
  const [answerHtml, setAnswerHtml] = useState("");
  const [steps, setSteps] = useState<any[]>([]);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [qaRows, registry] = await Promise.all([
        api.list("ai-qa"),
        api.getLocaleRegistry().catch(() => null),
      ]);
      setRows(qaRows as any[]);
      if (Array.isArray(registry?.locales) && registry.locales.length) {
        setLocaleOptions(registry.locales.map((locale: any) => ({ value: locale.code, label: `${String(locale.code).toUpperCase()} — ${locale.label || locale.code}` })));
      }
    }
    catch (error: any) { message.error(error?.message || "Could not load AI Q&A"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const openEditor = (item?: any) => {
    const current = item || { title: "", intent_key: "", locale: localeOptions[0]?.value || "en", status: "draft", approval_status: "draft", priority: 100, confidence_threshold: 86, source_type: "qa", platform_scope: "all", route_policy: "answer_only" };
    setEditing(current);
    setAnswerJson(current.qa_answer_json || blankDoc);
    setAnswerHtml(current.qa_answer_html || "");
    setSteps(Array.isArray(current.qa_steps) ? current.qa_steps : []);
    form.setFieldsValue({ ...current, qa_answer_html: undefined, qa_answer_json: undefined, qa_steps: undefined });
  };
  const closeEditor = () => { setEditing(null); form.resetFields(); setAnswerJson(blankDoc); setAnswerHtml(""); setSteps([]); };
  const uploadImage = async (file: File) => (await api.upload(file)).url;
  const addStepImage = async (file: File) => {
    try { const url = await uploadImage(file); setSteps((all) => [...all, { type: "image", url, role: "step", alt: file.name, caption: "Q&A step" }]); message.success("Step image added"); }
    catch (error: any) { message.error(error?.message || "Image upload failed"); }
    return false;
  };
  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await (editing?.id ? api.update("ai-qa", editing.id, { ...values, source_type: "qa", qa_answer_html: answerHtml, qa_answer_json: answerJson, qa_steps: steps }) : api.create("ai-qa", { ...values, source_type: "qa", qa_answer_html: answerHtml, qa_answer_json: answerJson, qa_steps: steps }));
      message.success(editing?.id ? "AI Q&A updated" : "AI Q&A created"); closeEditor(); await load();
    } catch (error: any) { if (error?.errorFields) return; message.error(error?.message || "Could not save AI Q&A"); }
    finally { setSaving(false); }
  };
  const publish = async (item: any) => { try { await api.requestAiQaPublish?.(item.id); message.success("AI Q&A published"); await load(); } catch (error: any) { message.error(error?.message || "Publish failed"); } };
  const remove = async (id: number) => { try { await api.remove("ai-qa", id); message.success("AI Q&A archived"); await load(); } catch (error: any) { message.error(error?.message || "Delete failed"); } };
  const columns = useMemo(() => [
    { title: "Question / intent", render: (_: any, row: any) => <div><b>{row.title}</b><div style={{ color: "#8ea0bd", fontSize: 12 }}>{row.intent_key}</div></div> },
    { title: "Locale", dataIndex: "locale", width: 90, render: (v: string) => <Tag>{String(v || "en").toUpperCase()}</Tag> },
    { title: "Source", dataIndex: "source_type", width: 90, render: () => <Tag color="blue">AI Q&A</Tag> },
    { title: "Approval", dataIndex: "approval_status", width: 110, render: (v: string) => <Tag color={v === "approved" ? "green" : "gold"}>{v || "draft"}</Tag> },
    { title: "Steps", dataIndex: "qa_steps", width: 70, render: (v: any[]) => Array.isArray(v) ? v.length : 0 },
    { title: "Actions", width: 190, render: (_: any, row: any) => <Space><Button size="small" icon={<EditOutlined />} onClick={() => openEditor(row)}>Edit</Button>{row.approval_status !== "approved" && <Button size="small" type="primary" onClick={() => publish(row)}>Approve & publish</Button>}<Popconfirm title="Archive this Q&A item?" onConfirm={() => remove(row.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ], []);

  return <>
    <Alert showIcon type="info" message="AI Q&A knowledge source" description="Imported questions become editable tenant-scoped Q&A drafts. Approve and publish an item before the AI can use its answer or visual steps. Locale fields are independent, so a platform only shows languages it supports." style={{ marginBottom: 12 }} />
    <div className="bdg-filters" style={{ marginBottom: 12 }}><div style={{ flex: 1, color: "#8ea0bd" }}>Q&A answers and visual steps are an additional source beside AI Prompt & Image.</div><Button onClick={() => void load()}>Refresh</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>New AI Q&A</Button></div>
    <Table rowKey="id" loading={loading} dataSource={rows} columns={columns as any} pagination={{ pageSize: 20 }} />
    <Drawer open={!!editing} onClose={closeEditor} width="min(1180px, 96vw)" title={editing?.id ? `Edit AI Q&A — ${editing.title}` : "Create AI Q&A"} extra={<Space><Button onClick={closeEditor}>Cancel</Button><Button type="primary" loading={saving} onClick={save}>Save</Button></Space>}>
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="Question title" rules={[{ required: true }]}><Input placeholder="My deposit has not arrived" /></Form.Item>
        <Space style={{ display: "flex" }} align="start"><Form.Item name="intent_key" label="Intent key" rules={[{ required: true }]} style={{ flex: 1 }}><Input placeholder="deposit-not-received" /></Form.Item><Form.Item name="locale" label="Locale" rules={[{ required: true }]} style={{ width: 220 }}><Select options={localeOptions} showSearch optionFilterProp="label" /></Form.Item><Form.Item name="status" label="Status" style={{ width: 150 }}><Select options={["draft", "published", "archived"].map((v) => ({ value: v, label: v }))} /></Form.Item></Space>
        <Space style={{ display: "flex" }} align="start"><Form.Item name="priority" label="Priority"><InputNumber min={1} max={999} /></Form.Item><Form.Item name="approval_status" label="Knowledge approval"><Select options={[{ value: "draft", label: "Draft" }, { value: "approved", label: "Approved" }, { value: "archived", label: "Archived" }]} /></Form.Item><Form.Item name="route_policy" label="Action policy" style={{ minWidth: 260 }}><Select options={["answer_only", "action_optional", "ticket_optional", "human_escalation"].map((v) => ({ value: v, label: v }))} /></Form.Item></Space>
        <Form.Item name="positive_examples" label="Positive examples"><Input.TextArea rows={4} placeholder="Users may write typos, mixed language, or short phrases." /></Form.Item>
        <Form.Item name="negative_examples" label="Negative examples"><Input.TextArea rows={4} /></Form.Item>
        <Form.Item name="ai_instruction" label="Locale-specific AI instruction"><Input.TextArea rows={4} placeholder="Use this answer style and ask for the required detail." /></Form.Item>
        <Form.Item label="Rich Q&A answer"><RichKnowledgeEditor value={answerJson} onChange={(json, html) => { setAnswerJson(json); setAnswerHtml(html); }} uploadImage={uploadImage} /></Form.Item>
        <Card size="small" title={`Visual steps (${steps.length})`} extra={<Upload showUploadList={false} beforeUpload={addStepImage} accept="image/png,image/jpeg,image/webp,image/gif"><Button icon={<UploadOutlined />}>Upload step image</Button></Upload>}>
          <Space direction="vertical" style={{ width: "100%" }}>{steps.map((step, index) => <Space key={`${step.url}-${index}`} style={{ width: "100%" }}><Input value={step.caption || ""} onChange={(e) => setSteps((all) => all.map((x, i) => i === index ? { ...x, caption: e.target.value } : x))} placeholder={`Step ${index + 1} caption`} /><Button danger onClick={() => setSteps((all) => all.filter((_, i) => i !== index))}>Remove</Button></Space>)}</Space>
        </Card>
      </Form>
    </Drawer>
  </>;
}

