import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Form, Input, Select, Space, Table, Tabs, Tag, Upload, message, Popconfirm, Card, Row, Col, Alert } from "antd";
import { EditOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined, UploadOutlined, ArrowUpOutlined, ArrowDownOutlined, CopyOutlined, BulbOutlined, TranslationOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/guide-images")({ component: GuideManager });

type GuideBlock =
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "step"; title: string; text: string; image?: string }
  | { type: "note"; text: string }
  | { type: "warning"; text: string }
  | { type: "button"; label: string; url: string }
  | { type: "divider" }
  | { type: "faqRef"; faqId: string };

type GuideRow = {
  id: number | string;
  title: string;
  title_hi?: string;
  slug: string;
  summary?: string;
  summary_hi?: string;
  body?: string;
  body_hi?: string;
  body_blocks_json?: string;
  body_blocks_json_hi?: string;
  blocks?: GuideBlock[];
  image_urls?: string[] | string;
  image_urls_hi?: string[] | string;
  cover_image_url?: string;
  cover_image_url_hi?: string;
  keywords?: string;
  language?: string;
  priority?: number;
  status?: string;
  category_id?: number | string | null;
  category_name?: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function splitLines(v: unknown) {
  return String(v || "").split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
}
function parseBlocks(raw: any, fallbackText = "", fallbackImages: string[] = []): GuideBlock[] {
  if (Array.isArray(raw) && raw.length) return raw as GuideBlock[];
  if (typeof raw === "string" && raw.trim()) {
    try { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; } catch {}
  }
  const blocks: GuideBlock[] = [];
  for (const line of String(fallbackText || "").replace(/\\n/g, "\n").split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) blocks.push({ type: "step", title: `Step ${numbered[1]}`, text: numbered[2] });
    else if (/^Q[:：]/i.test(line)) blocks.push({ type: "heading", level: 3, text: line });
    else if (/^A[:：]/i.test(line)) blocks.push({ type: "note", text: line.replace(/^A[:：]\s*/i, "") });
    else if (line.length < 80 && line === line.toUpperCase() && /[A-Z]/.test(line)) blocks.push({ type: "heading", level: 2, text: line });
    else blocks.push({ type: "paragraph", text: line });
  }
  fallbackImages.forEach((url) => blocks.push({ type: "image", url, alt: "Guide screenshot", caption: "Guide screenshot" }));
  return blocks;
}
function textFromBlocks(blocks: GuideBlock[]) {
  return blocks.map((b) => {
    if (b.type === "heading" || b.type === "paragraph" || b.type === "note" || b.type === "warning") return b.text;
    if (b.type === "step") return `${b.title}\n${b.text}`.trim();
    if (b.type === "image") return b.caption || b.alt || "";
    if (b.type === "button") return `${b.label} ${b.url}`.trim();
    return "";
  }).filter(Boolean).join("\n\n");
}
function imageUrlsFromBlocks(blocks: GuideBlock[]) {
  return blocks.flatMap((b) => b.type === "image" && b.url ? [b.url] : b.type === "step" && b.image ? [b.image] : []);
}

function emptyBlock(type: GuideBlock["type"]): GuideBlock {
  if (type === "heading") return { type, level: 2, text: "New heading" };
  if (type === "paragraph") return { type, text: "" };
  if (type === "image") return { type, url: "", alt: "", caption: "" };
  if (type === "step") return { type, title: "Step title", text: "" };
  if (type === "note") return { type, text: "" };
  if (type === "warning") return { type, text: "" };
  if (type === "button") return { type, label: "Open", url: "" };
  if (type === "faqRef") return { type, faqId: "" };
  return { type: "divider" };
}

function GuideManager() {
  const [rows, setRows] = useState<GuideRow[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GuideRow | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<string | number>>([]);
  const [blocksEn, setBlocksEn] = useState<GuideBlock[]>([]);
  const [blocksHi, setBlocksHi] = useState<GuideBlock[]>([]);
  const [form] = Form.useForm();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRawText, setAiRawText] = useState("");
  const [aiLanguage, setAiLanguage] = useState<"en" | "hi">("en");
  const [aiTemplate, setAiTemplate] = useState("problem_solution");

  const load = async () => {
    setLoading(true);
    try { const [guideRows, categoryRows] = await Promise.all([api.list("guide-images"), api.list("categories")]); setRows(guideRows as GuideRow[]); setCategories(categoryRows as any[]); setSelectedRowKeys([]); }
    catch (e: any) { message.error(e?.message || "Failed to load guides"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: "published", language: "en", priority: 100, category_id: categories[0]?.id || null });
    setBlocksEn([{ type: "heading", level: 2, text: "Guide title" }, { type: "paragraph", text: "Write your guide text here." }]);
    setBlocksHi([]);
    setOpen(true);
  };
  const openEdit = (row: GuideRow) => {
    setEditing(row);
    const enImages = Array.isArray(row.image_urls) ? row.image_urls : splitLines(row.image_urls);
    const hiImages = Array.isArray(row.image_urls_hi) ? row.image_urls_hi : splitLines(row.image_urls_hi);
    setBlocksEn(parseBlocks(row.body_blocks_json || row.blocks, row.body || "", enImages));
    setBlocksHi(parseBlocks(row.body_blocks_json_hi, row.body_hi || "", hiImages));
    form.setFieldsValue({
      ...row,
      image_urls: enImages.join("\n"),
      image_urls_hi: hiImages.join("\n"),
    });
    setOpen(true);
  };
  const save = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      body: textFromBlocks(blocksEn) || values.body || "",
      body_hi: textFromBlocks(blocksHi) || values.body_hi || "",
      body_blocks_json: JSON.stringify(blocksEn),
      body_blocks_json_hi: JSON.stringify(blocksHi),
      image_urls: [...new Set([...splitLines(values.image_urls), ...imageUrlsFromBlocks(blocksEn)])],
      image_urls_hi: [...new Set([...splitLines(values.image_urls_hi), ...imageUrlsFromBlocks(blocksHi)])],
    };
    try {
      if (editing) await api.update("guide-images", editing.id, payload);
      else await api.create("guide-images", payload);
      message.success(editing ? "Guide updated" : "Guide created");
      setOpen(false);
      load();
    } catch (e: any) { message.error(e?.message || "Save failed"); }
  };
  const uploadImage = async (file: File, field: string) => {
    try {
      const res = await api.upload(file);
      const current = form.getFieldValue(field) || "";
      form.setFieldValue(field, `${current}${current ? "\n" : ""}${res.url}`);
      message.success("Image uploaded");
    } catch (e: any) { message.error(e?.message || "Upload failed"); }
    return false;
  };
  const bulkDelete = async () => {
    await api.bulkRemove("guide-images", selectedRowKeys as any[]);
    message.success(`Deleted ${selectedRowKeys.length} guide(s)`);
    load();
  };

  const openAiBuilder = () => {
    if (!open) openCreate();
    setAiRawText("");
    setAiLanguage("en");
    setAiTemplate("problem_solution");
    setAiOpen(true);
  };

  const applyAiLayout = async () => {
    if (!aiRawText.trim()) { message.warning("Paste guide text first"); return; }
    setAiLoading(true);
    try {
      const res: any = await api.generateGuideLayout({ raw_text: aiRawText, language: aiLanguage, template: aiTemplate });
      if (!res?.ok) throw new Error(res?.error || "AI layout generation failed");
      const blocks = Array.isArray(res.blocks) ? res.blocks : [];
      if (aiLanguage === "hi") {
        form.setFieldsValue({
          title_hi: res.title_hi || res.title || form.getFieldValue("title_hi"),
          summary_hi: res.summary_hi || res.summary || form.getFieldValue("summary_hi"),
          keywords: form.getFieldValue("keywords") || res.keywords,
        });
        setBlocksHi(blocks);
      } else {
        form.setFieldsValue({
          title: res.title || form.getFieldValue("title"),
          summary: res.summary || form.getFieldValue("summary"),
          slug: form.getFieldValue("slug") || res.slug,
          keywords: form.getFieldValue("keywords") || res.keywords,
        });
        setBlocksEn(blocks);
      }
      message.success("AI layout draft generated. Review and edit before publishing.");
      setAiOpen(false);
      setOpen(true);
    } catch (e: any) {
      message.error(e?.message || "AI Guide Builder failed");
    } finally { setAiLoading(false); }
  };

  const copyEnglishLayoutToHindi = async () => {
    if (!blocksEn.length) { message.warning("Create English layout first"); return; }
    try {
      const res: any = await api.copyGuideLayout(blocksEn, "hi");
      setBlocksHi(Array.isArray(res.blocks) ? res.blocks : blocksEn.map((b: any) => ({ ...b })));
      form.setFieldsValue({
        title_hi: form.getFieldValue("title_hi") || `${form.getFieldValue("title") || "Guide"} (Hindi draft)`,
        summary_hi: form.getFieldValue("summary_hi") || form.getFieldValue("summary") || "",
      });
      message.success("English layout copied to Hindi draft. Translate text and replace screenshots.");
    } catch (e: any) { message.error(e?.message || "Copy layout failed"); }
  };

  const copyEnglishTextToHindiDraft = () => {
    if (!blocksEn.length) { message.warning("Create English layout first"); return; }
    setBlocksHi(blocksEn.map((b: any) => {
      if (b.type === "image") return { ...b, url: "", caption: "Upload Hindi/Indian screenshot here" };
      if (b.type === "step") return { ...b, image: "", title: `${b.title || "Step"} (Hindi draft)` };
      if (b.type === "heading") return { ...b, text: `${b.text || "Guide"} (Hindi draft)` };
      return { ...b };
    }));
    message.success("English text copied into Hindi draft. Translate it and upload Indian screenshots.");
  };

  const columns: ColumnsType<GuideRow> = [
    { title: "Title", dataIndex: "title", render: (_, r) => <div><b>{r.title}</b><div style={{ color: "#8ea0bd", fontSize: 12 }}>{r.slug}</div></div> },
    { title: "Hindi Title", dataIndex: "title_hi", responsive: ["lg"] },
    { title: "Category", dataIndex: "category_name", width: 140 },
    { title: "Status", dataIndex: "status", width: 120, render: (v) => <Tag color={v === "published" ? "success" : "default"}>{v}</Tag> },
    { title: "Priority", dataIndex: "priority", width: 90 },
    { title: "Actions", width: 170, render: (_, row) => <Space>
      <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>Edit</Button>
      <Popconfirm title="Delete this guide?" onConfirm={() => api.remove("guide-images", row.id).then(load)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
    </Space> },
  ];

  return <>
    <div className="bdg-filters">
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0 }}>Guide</h2>
        <div style={{ color: "#8ea0bd", fontSize: 12 }}>Flexible visual guide builder with language-specific blocks and images.</div>
      </div>
      <Space wrap>
        {selectedRowKeys.length > 0 && <Popconfirm title={`Delete ${selectedRowKeys.length} selected guide(s)?`} onConfirm={bulkDelete} okButtonProps={{ danger: true }}><Button danger icon={<DeleteOutlined />}>Delete selected</Button></Popconfirm>}
        <Select value={pageSize} onChange={setPageSize} options={[20,50,100].map(n => ({ value: n, label: `${n} / page` }))} style={{ width: 120 }} />
        <Button icon={<BulbOutlined />} onClick={openAiBuilder}>AI Guide Builder</Button>
        <Button icon={<TranslationOutlined />} onClick={copyEnglishLayoutToHindi}>Copy EN layout to Hindi</Button>
        <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create guide</Button>
      </Space>
    </div>
    <Alert style={{ marginBottom: 12 }} showIcon type="info" message="Visual Guide Builder" description="Paste raw text into AI Guide Builder. AI prepares a professional editable block layout, suggests image positions, and lets admin copy the same layout into Hindi/Indian draft." />
    <Table className="bdg-table" rowKey="id" rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as Array<string | number>) }} loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize, showSizeChanger: false, showTotal: (t) => `${t} records` }} />
    <Drawer title={editing ? "Edit guide" : "Create guide"} open={open} onClose={() => setOpen(false)} width={1040} extra={<Space><Button icon={<BulbOutlined />} onClick={() => setAiOpen(true)}>AI layout</Button><Button icon={<TranslationOutlined />} onClick={copyEnglishLayoutToHindi}>Copy EN layout to Hindi</Button><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="primary" onClick={save}>Save</Button></Space>}>
      <Form layout="vertical" form={form}>
        <Tabs items={[
          { key: "en", label: "English Guide", children: <LanguageGuideTab blocks={blocksEn} setBlocks={setBlocksEn} imageField="image_urls" uploadImage={uploadImage} /> },
          { key: "hi", label: "Hindi / Indian Guide", children: <LanguageGuideTab blocks={blocksHi} setBlocks={setBlocksHi} imageField="image_urls_hi" uploadImage={uploadImage} hi /> },
          { key: "meta", label: "Settings", children: <>
            <Form.Item name="slug" label="Slug"><Input placeholder="deposit-not-received" /></Form.Item>
            <Form.Item name="keywords" label="Search keywords"><Input placeholder="deposit, recharge, not received" /></Form.Item>
            <Form.Item name="category_id" label="Category">
              <Select
                allowClear
                placeholder="Choose category"
                options={categories.map((c: any) => ({ value: c.id, label: `${c.icon || ""} ${c.name}`.trim() }))}
              />
            </Form.Item>
            <Row gutter={12}>
              <Col span={8}><Form.Item name="status" label="Status"><Select options={["draft", "published", "archived"].map(x => ({ value: x, label: x }))} /></Form.Item></Col>
              <Col span={8}><Form.Item name="language" label="Default language"><Select options={[{ value: "en", label: "English" }, { value: "hi", label: "Hindi" }]} /></Form.Item></Col>
              <Col span={8}><Form.Item name="priority" label="Priority"><Input type="number" /></Form.Item></Col>
            </Row>
            <Form.Item name="cover_image_url" label="English cover image URL"><Input addonAfter={<Upload showUploadList={false} beforeUpload={(f) => uploadImage(f, "cover_image_url")}><Button size="small" icon={<UploadOutlined />}>Upload</Button></Upload>} /></Form.Item>
            <Form.Item name="cover_image_url_hi" label="Hindi cover image URL"><Input addonAfter={<Upload showUploadList={false} beforeUpload={(f) => uploadImage(f, "cover_image_url_hi")}><Button size="small" icon={<UploadOutlined />}>Upload</Button></Upload>} /></Form.Item>
          </> },
        ]} />
      </Form>
    </Drawer>
    <Drawer title="AI Guide Builder" open={aiOpen} onClose={() => setAiOpen(false)} width={760} extra={<Space><Button onClick={() => setAiOpen(false)}>Cancel</Button><Button type="primary" loading={aiLoading} icon={<BulbOutlined />} onClick={applyAiLayout}>Generate editable layout</Button></Space>}>
      <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Admin approval required" description="AI will organize your provided guide text into a professional block layout. It must not invent rules, waiting times, amounts, or security requirements. Review before publishing." />
      <Row gutter={12}>
        <Col span={12}>
          <label style={{ display: 'block', marginBottom: 6, color: '#8ea0bd' }}>Target language</label>
          <Select value={aiLanguage} onChange={(v) => setAiLanguage(v as "en" | "hi")} style={{ width: '100%' }} options={[{ value: 'en', label: 'English layout' }, { value: 'hi', label: 'Hindi / Indian layout' }]} />
        </Col>
        <Col span={12}>
          <label style={{ display: 'block', marginBottom: 6, color: '#8ea0bd' }}>Layout style</label>
          <Select value={aiTemplate} onChange={setAiTemplate} style={{ width: '100%' }} options={[
            { value: 'problem_solution', label: 'Problem → Solution Guide' },
            { value: 'step_guide', label: 'Simple Step Guide' },
            { value: 'image_first', label: 'Image First Guide' },
            { value: 'faq', label: 'FAQ Guide' },
            { value: 'security', label: 'Warning / Security Guide' },
            { value: 'long_tutorial', label: 'Long Tutorial Guide' },
          ]} />
        </Col>
      </Row>
      <div style={{ marginTop: 16 }}>
        <label style={{ display: 'block', marginBottom: 6, color: '#8ea0bd' }}>Paste raw official guide text</label>
        <Input.TextArea rows={14} value={aiRawText} onChange={(e) => setAiRawText(e.target.value)} placeholder={`Paste your official guide text here. Example:
Deposit Not Received
1. Open Customer Service.
2. Select Deposit Not Received.
3. Upload clear receipt.`} />
      </div>
      <Alert style={{ marginTop: 12 }} type="info" showIcon message="Hindi workflow" description="Create English layout first, then use Copy EN layout to Hindi. You only need to translate the text and replace screenshots with Indian/Hindi screenshots." />
      <Space style={{ marginTop: 12 }} wrap>
        <Button onClick={copyEnglishLayoutToHindi} icon={<TranslationOutlined />}>Copy current English layout to Hindi</Button>
        <Button onClick={copyEnglishTextToHindiDraft}>Copy English text to Hindi draft</Button>
      </Space>
    </Drawer>
  </>;
}

function LanguageGuideTab({ blocks, setBlocks, imageField, uploadImage, hi = false }: { blocks: GuideBlock[]; setBlocks: (b: GuideBlock[]) => void; imageField: string; uploadImage: (file: File, field: string) => Promise<boolean>; hi?: boolean }) {
  const addBlock = (type: GuideBlock["type"]) => setBlocks([...blocks, emptyBlock(type)]);
  const update = (i: number, b: GuideBlock) => setBlocks(blocks.map((x, idx) => idx === i ? b : x));
  const remove = (i: number) => setBlocks(blocks.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const copy = blocks.slice();
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setBlocks(copy);
  };
  const duplicate = (i: number) => setBlocks([...blocks.slice(0, i + 1), { ...(blocks[i] as any) }, ...blocks.slice(i + 1)]);
  const uploadToBlock = async (file: File, i: number, key: "url" | "image") => {
    const res = await api.upload(file);
    update(i, { ...(blocks[i] as any), [key]: res.url } as GuideBlock);
    message.success("Image uploaded into block");
    return false;
  };
  return <div>
    <Row gutter={12}>
      <Col span={12}><Form.Item name={hi ? "title_hi" : "title"} label={hi ? "Hindi title" : "English title"} rules={hi ? [] : [{ required: true }]}><Input /></Form.Item></Col>
      <Col span={12}><Form.Item name={hi ? "summary_hi" : "summary"} label={hi ? "Hindi summary" : "English summary"}><Input /></Form.Item></Col>
    </Row>
    <Form.Item name={imageField} label={hi ? "Hindi/Indian image URLs also used by this guide" : "English image URLs also used by this guide"}><Input.TextArea rows={2} /></Form.Item>
    <Upload showUploadList={false} beforeUpload={(f) => uploadImage(f, imageField)}><Button icon={<UploadOutlined />}>Upload image URL</Button></Upload>
    <Card className="bdg-card" size="small" title="Flexible blocks" style={{ marginTop: 12 }}>
      <Space wrap style={{ marginBottom: 12 }}>
        {["heading","paragraph","image","step","note","warning","button","divider","faqRef"].map((t) => <Button key={t} size="small" onClick={() => addBlock(t as any)}>{t}</Button>)}
      </Space>
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        {blocks.map((b, i) => <Card key={i + uid()} size="small" title={`${i + 1}. ${b.type}`} extra={<Space><Button size="small" icon={<ArrowUpOutlined />} onClick={() => move(i, -1)} /><Button size="small" icon={<ArrowDownOutlined />} onClick={() => move(i, 1)} /><Button size="small" icon={<CopyOutlined />} onClick={() => duplicate(i)} /><Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(i)} /></Space>}>
          <BlockFields block={b} update={(next) => update(i, next)} upload={(file, key) => uploadToBlock(file, i, key)} />
        </Card>)}
      </Space>
    </Card>
  </div>;
}

function BlockFields({ block, update, upload }: { block: GuideBlock; update: (b: GuideBlock) => void; upload: (file: File, key: "url" | "image") => Promise<boolean> }) {
  if (block.type === "heading") return <Space direction="vertical" style={{ width: "100%" }}><Select value={block.level || 2} onChange={(level) => update({ ...block, level })} options={[{ value: 2, label: "H2" }, { value: 3, label: "H3" }]} /><Input value={block.text} onChange={(e) => update({ ...block, text: e.target.value })} /></Space>;
  if (block.type === "paragraph" || block.type === "note" || block.type === "warning") return <Input.TextArea rows={4} value={block.text} onChange={(e) => update({ ...block, text: e.target.value } as GuideBlock)} />;
  if (block.type === "image") return <Space direction="vertical" style={{ width: "100%" }}><Input placeholder="Image URL" value={block.url} onChange={(e) => update({ ...block, url: e.target.value })} /><Upload showUploadList={false} beforeUpload={(f) => upload(f, "url")}><Button icon={<UploadOutlined />}>Upload into image block</Button></Upload><Input placeholder="Caption" value={block.caption || ""} onChange={(e) => update({ ...block, caption: e.target.value })} />{block.url && <img src={block.url} alt="" style={{ maxWidth: 260, maxHeight: 160, borderRadius: 8 }} />}</Space>;
  if (block.type === "step") return <Space direction="vertical" style={{ width: "100%" }}><Input value={block.title} onChange={(e) => update({ ...block, title: e.target.value })} /><Input.TextArea rows={3} value={block.text} onChange={(e) => update({ ...block, text: e.target.value })} /><Input placeholder="Optional step image URL" value={block.image || ""} onChange={(e) => update({ ...block, image: e.target.value })} /><Upload showUploadList={false} beforeUpload={(f) => upload(f, "image")}><Button icon={<UploadOutlined />}>Upload step image</Button></Upload></Space>;
  if (block.type === "button") return <Row gutter={12}><Col span={12}><Input placeholder="Button label" value={block.label} onChange={(e) => update({ ...block, label: e.target.value })} /></Col><Col span={12}><Input placeholder="URL" value={block.url} onChange={(e) => update({ ...block, url: e.target.value })} /></Col></Row>;
  if (block.type === "faqRef") return <Input placeholder="FAQ id" value={block.faqId} onChange={(e) => update({ ...block, faqId: e.target.value })} />;
  return <div style={{ color: "#8ea0bd" }}>Divider block</div>;
}
