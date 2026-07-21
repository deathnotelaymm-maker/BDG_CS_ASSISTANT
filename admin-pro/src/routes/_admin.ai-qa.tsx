import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { Key } from "react";
<<<<<<< Updated upstream
import { Alert, Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Upload, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import RichKnowledgeEditor from "@/components/RichKnowledgeEditor";
import { api } from "@/lib/api";
=======
import { Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Upload, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import RichKnowledgeEditor from "@/components/RichKnowledgeEditor";
import { api } from "@/lib/api";
import LocalizedHelp from "@/components/LocalizedHelp";
>>>>>>> Stashed changes

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
  const [filters, setFilters] = useState({ q: "", locale: "", status: "", approval: "", has_images: "" });
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [qaRows, registry] = await Promise.all([
        api.listAiQa(filters),
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
  useEffect(() => { void load(); }, [filters.q, filters.locale, filters.status, filters.approval, filters.has_images]);

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
  const runBatch = async (kind: "approve" | "publish" | "delete") => {
    if (!selectedKeys.length) { message.warning("Select at least one item"); return; }
    try {
      if (kind === "approve") await api.batchApproveAiQa(selectedKeys as Array<string | number>);
      if (kind === "publish") await api.batchPublishAiQa(selectedKeys as Array<string | number>);
      if (kind === "delete") await api.batchDeleteAiQa(selectedKeys as Array<string | number>);
      message.success(`Batch ${kind} completed`); setSelectedKeys([]); await load();
    } catch (error: any) { message.error(error?.message || `Batch ${kind} failed`); }
  };
  const columns = useMemo(() => [
    { title: "Name / question", render: (_: any, row: any) => <div><b>{row.content_name || row.name || row.title}</b><div>{row.title}</div><div style={{ color: "#8ea0bd", fontSize: 12 }}>{row.intent_key}</div></div> },
    { title: "Locale", dataIndex: "locale", width: 90, render: (v: string) => <Tag>{String(v || "en").toUpperCase()}</Tag> },
    { title: "Source", dataIndex: "source_type", width: 90, render: () => <Tag color="blue">AI Q&A</Tag> },
    { title: "Approval", dataIndex: "approval_status", width: 110, render: (v: string) => <Tag color={v === "approved" ? "green" : "gold"}>{v || "draft"}</Tag> },
    { title: "Steps", dataIndex: "qa_steps", width: 70, render: (v: any[]) => Array.isArray(v) ? v.length : 0 },
    { title: "Actions", width: 190, render: (_: any, row: any) => <Space><Button size="small" icon={<EditOutlined />} onClick={() => openEditor(row)}>Edit</Button>{row.approval_status !== "approved" && <Button size="small" type="primary" onClick={() => publish(row)}>Approve & publish</Button>}<Popconfirm title="Archive this Q&A item?" onConfirm={() => remove(row.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ], []);

  return <>
<<<<<<< Updated upstream
    <Alert showIcon type="info" message="AI Q&A knowledge source" description="Imported questions become editable tenant-scoped Q&A drafts. Approve and publish an item before the AI can use its answer or visual steps. Locale fields are independent, so a platform only shows languages it supports." style={{ marginBottom: 12 }} />
=======
    <LocalizedHelp copies={{
      en: { title: "AI Q&A knowledge source", body: "Imported questions become editable tenant-scoped Q&A drafts. Approve and publish an item before the AI can use its answer or visual steps. Locale fields are independent, so a platform only shows languages it supports.", bullets: ["Use Name for the searchable content label; use Question and Intent for matching.", "Publish only after the rich answer and every image step has been reviewed."] },
      zh: { title: "AI 问答知识来源", body: "导入的问题会变成当前租户的可编辑问答草稿。必须先批准并发布，AI 才能使用答案和视觉步骤。每种语言独立保存，平台只显示已启用的语言。", bullets: ["Name 用于搜索内容名称；Question 和 Intent 用于匹配用户问题。", "检查富文本答案和每个图片步骤后再发布。"] },
      my: { title: "AI Q&A အသိပညာရင်းမြစ်", body: "တင်သွင်းထားသော မေးခွန်းများသည် tenant အလိုက် ပြင်ဆင်နိုင်သော Q&A draft ဖြစ်လာသည်။ AI အသုံးပြုနိုင်ရန် အတည်ပြုပြီး ထုတ်ဝေရမည်။ Locale တစ်ခုချင်းစီ သီးခြားသိမ်းဆည်းထားပြီး platform တွင် ဖွင့်ထားသော ဘာသာများသာ ပြမည်။", bullets: ["Name သည် ရှာဖွေရန် အမည်ဖြစ်ပြီး Question နှင့် Intent သည် ကိုက်ညီမှုအတွက် ဖြစ်သည်။", "Rich answer နှင့် ပုံအဆင့်တိုင်းကို စစ်ဆေးပြီးမှ ထုတ်ဝေပါ။"] },
    }} />
>>>>>>> Stashed changes
    <Card size="small" style={{ marginBottom: 12 }}><Space wrap style={{ width: "100%" }}><Input.Search allowClear value={filters.q} onChange={(e) => setFilters((v) => ({ ...v, q: e.target.value }))} placeholder="Search name, question, intent" style={{ width: 280 }} /><Select allowClear placeholder="Locale" value={filters.locale || undefined} onChange={(v) => setFilters((x) => ({ ...x, locale: v || "" }))} options={localeOptions} style={{ width: 150 }} /><Select allowClear placeholder="Status" value={filters.status || undefined} onChange={(v) => setFilters((x) => ({ ...x, status: v || "" }))} options={["draft", "published", "archived"].map((v) => ({ value: v, label: v }))} /><Select allowClear placeholder="Approval" value={filters.approval || undefined} onChange={(v) => setFilters((x) => ({ ...x, approval: v || "" }))} options={["draft", "approved", "archived"].map((v) => ({ value: v, label: v }))} /><Select allowClear placeholder="Images" value={filters.has_images || undefined} onChange={(v) => setFilters((x) => ({ ...x, has_images: v || "" }))} options={[{ value: "true", label: "Has images" }]} /><Button onClick={() => void load()}>Refresh</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>New AI Q&A</Button></Space></Card>
    <Space style={{ marginBottom: 12 }} wrap><Button disabled={!selectedKeys.length} onClick={() => void runBatch("approve")}>Approve selected</Button><Button disabled={!selectedKeys.length} type="primary" onClick={() => void runBatch("publish")}>Publish selected</Button><Button disabled={!selectedKeys.length} danger onClick={() => void runBatch("delete")}>Archive selected</Button>{selectedKeys.length ? <Tag>{selectedKeys.length} selected</Tag> : null}</Space>
    <Table rowKey="id" loading={loading} dataSource={rows} rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }} columns={columns as any} pagination={{ pageSize: 20 }} />
    <Drawer open={!!editing} onClose={closeEditor} width="min(1180px, 96vw)" title={editing?.id ? `Edit AI Q&A — ${editing.title}` : "Create AI Q&A"} extra={<Space><Button onClick={closeEditor}>Cancel</Button><Button type="primary" loading={saving} onClick={save}>Save</Button></Space>}>
      <Form form={form} layout="vertical">
        <Form.Item name="content_name" label="Name" rules={[{ required: true }]}><Input placeholder="Deposit not received" /></Form.Item>
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
