import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import RichKnowledgeEditor from "@/components/RichKnowledgeEditor";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/guide-images")({ component: VisualGuideStudio });

const EMPTY_DOC = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

function plainText(html: string) {
  if (typeof document === "undefined") return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const node = document.createElement("div");
  node.innerHTML = html || "";
  return (node.textContent || "").replace(/\s+/g, " ").trim();
}

function editorValue(json: unknown, html: unknown, text: unknown) {
  if (typeof json === "string" && json.trim()) {
    try {
      if (JSON.parse(json)?.type === "doc") return json;
    } catch (_) {
      // Use the HTML/text fallback below when an older guide has invalid JSON.
    }
  }
  return String(html || text || "") || EMPTY_DOC;
}

type Locale = { code: string; label?: string; native_name?: string; direction?: string; is_default?: boolean };

function localeName(locale: Locale) {
  return locale.native_name && locale.native_name !== locale.label
    ? `${locale.label || locale.code} · ${locale.native_name}`
    : locale.label || locale.code;
}

function emptyTranslation(locale: Locale) {
  return {
    id: undefined,
    locale: locale.code,
    title: "",
    summary: "",
    body: "",
    rich_json: EMPTY_DOC,
    rich_html: "",
    image_urls: [],
    cover_image_url: "",
    keywords: "",
    seo_title: "",
    seo_description: "",
    alt_text: "",
    status: "draft",
  };
}

function rowToTranslation(row: any, locale: Locale) {
  return {
    ...emptyTranslation(locale),
    ...row,
    locale: row?.locale || locale.code,
    rich_json: editorValue(row?.rich_json, row?.rich_html, row?.body),
    rich_html: row?.rich_html || "",
    image_urls: Array.isArray(row?.image_urls) ? row.image_urls : [],
  };
}

function VisualGuideStudio() {
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [buttons, setButtons] = useState<any[]>([]);
  const [locales, setLocales] = useState<Locale[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [activeLocale, setActiveLocale] = useState("");
  const [editorJson, setEditorJson] = useState(EMPTY_DOC);
  const [editorHtml, setEditorHtml] = useState("");
  const [form] = Form.useForm();

  const defaultLocale = useMemo(
    () => locales.find((locale) => locale.is_default)?.code || locales[0]?.code || "en",
    [locales],
  );
  const activeDocument = translations[activeLocale] || emptyTranslation({ code: activeLocale || defaultLocale });

  const load = async () => {
    setLoading(true);
    try {
      const [guides, categoryRows, actionRows, registry] = await Promise.all([
        api.list("guide-images"),
        api.list("categories"),
        api.list("action-buttons"),
        api.getGuideLocaleStudio(),
      ]);
      setRows(guides as any[]);
      setCategories(categoryRows as any[]);
      setButtons(actionRows as any[]);
      const registryLocales = Array.isArray((registry as any)?.locales) ? (registry as any).locales : [];
      setLocales(registryLocales);
      if (registryLocales.length && !activeLocale) setActiveLocale((registry as any).platform?.default_locale || registryLocales[0].code);
    } catch (error: any) {
      message.error(error?.message || "Failed to load Guide Locale Studio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!editing || !activeLocale) return;
    const document = translations[activeLocale] || emptyTranslation({ code: activeLocale });
    setEditorJson(document.rich_json || EMPTY_DOC);
    setEditorHtml(document.rich_html || "");
    form.setFieldsValue({
      title: document.title,
      summary: document.summary,
      keywords: document.keywords,
      seo_title: document.seo_title,
      seo_description: document.seo_description,
      alt_text: document.alt_text,
      cover_image_url: document.cover_image_url,
      status: document.status || "draft",
    });
  }, [activeLocale, editing, translations, form]);

  const openEditor = async (row?: any) => {
    setEditing(row || { title: "", slug: "", status: "draft", priority: 100, button_ids: [] });
    const selected = locales.find((locale) => locale.is_default)?.code || locales[0]?.code || "en";
    setActiveLocale(selected);
    form.setFieldsValue(row || { title: "", slug: "", status: "draft", priority: 100, button_ids: [] });
    if (!row?.id) {
      setTranslations({ [selected]: emptyTranslation({ code: selected }) });
      return;
    }
    try {
      const result: any = await api.listGuideTranslations(row.id);
      const next: Record<string, any> = {};
      for (const locale of locales) {
        const found = (result?.translations || []).find((translation: any) => translation.locale === locale.code);
        next[locale.code] = found ? rowToTranslation(found, locale) : emptyTranslation(locale);
      }
      next[selected] = next[selected]?.title ? next[selected] : rowToTranslation({
        locale: selected,
        title: row.title,
        summary: row.summary,
        body: row.body,
        rich_json: row.body_blocks_json,
        rich_html: row.body_html,
        image_urls: row.image_urls,
        cover_image_url: row.cover_image_url,
        keywords: row.keywords,
        status: row.status,
      }, locales.find((locale) => locale.code === selected) || { code: selected });
      setTranslations(next);
    } catch (error: any) {
      message.error(error?.message || "Could not load guide translations");
      setTranslations({ [selected]: emptyTranslation({ code: selected }) });
    }
  };

  const close = () => { setEditing(null); setTranslations({}); form.resetFields(); };

  const updateActiveDocument = (patch: any) => {
    setTranslations((current) => ({
      ...current,
      [activeLocale]: { ...(current[activeLocale] || emptyTranslation({ code: activeLocale })), ...patch },
    }));
  };

  const uploadImage = async (file: File) => (await api.upload(file)).url;
  const uploadCover = async (file: File) => {
    try {
      const url = await uploadImage(file);
      updateActiveDocument({ cover_image_url: url });
      form.setFieldValue("cover_image_url", url);
      message.success("Cover image uploaded");
    } catch (error: any) { message.error(error?.message || "Upload failed"); }
    return false;
  };

  const save = async () => {
    const values = await form.validateFields();
    const document = {
      ...(translations[activeLocale] || emptyTranslation({ code: activeLocale })),
      ...values,
      locale: activeLocale,
      body: plainText(editorHtml),
      rich_json: editorJson,
      rich_html: editorHtml,
    };
    if (!document.title) { message.error(`Add a title for ${activeLocale}`); return; }
    try {
      let guide = editing;
      if (!guide?.id) {
        guide = await api.create("guide-images", {
          title: document.title,
          summary: document.summary,
          body: document.body,
          body_html: document.rich_html,
          body_blocks_json: document.rich_json,
          slug: form.getFieldValue("slug"),
          status: form.getFieldValue("status") || "draft",
          language: activeLocale,
          priority: form.getFieldValue("priority") || 100,
          category_id: form.getFieldValue("category_id"),
          keywords: document.keywords,
          button_ids: form.getFieldValue("button_ids") || [],
        });
        setEditing(guide);
      } else {
        // The legacy guides endpoint is a full-row update. Keep the base
        // locale's values intact while editing a non-default translation;
        // otherwise a partial payload would overwrite the guide with empty
        // fields or the generic "Guide" placeholder.
        const baseLocale = defaultLocale;
        const base = translations[baseLocale] || rowToTranslation(guide, { code: baseLocale });
        await api.update("guide-images", guide.id, {
          title: base.title || guide.title || "Guide",
          summary: base.summary || guide.summary || "",
          body: base.body || guide.body || "",
          body_html: base.rich_html || guide.body_html || "",
          body_blocks_json: base.rich_json || guide.body_blocks_json || "",
          image_urls: base.image_urls || guide.image_urls || [],
          cover_image_url: base.cover_image_url || guide.cover_image_url || "",
          keywords: base.keywords || guide.keywords || "",
          language: baseLocale,
          title_hi: guide.title_hi || "",
          summary_hi: guide.summary_hi || "",
          body_hi: guide.body_hi || "",
          body_html_hi: guide.body_html_hi || "",
          body_blocks_json_hi: guide.body_blocks_json_hi || "",
          image_urls_hi: guide.image_urls_hi || [],
          cover_image_url_hi: guide.cover_image_url_hi || "",
          slug: form.getFieldValue("slug"),
          category_id: form.getFieldValue("category_id"),
          priority: form.getFieldValue("priority"),
          status: guide.status || "draft",
          button_ids: form.getFieldValue("button_ids") || [],
        });
      }
      const result: any = document.id
        ? await api.updateGuideTranslation(document.id, document)
        : await api.saveGuideTranslation(guide.id, document);
      const saved = result?.translation || document;
      setTranslations((current) => ({ ...current, [activeLocale]: { ...document, ...saved } }));
      message.success(`Saved ${localeName(locales.find((locale) => locale.code === activeLocale) || { code: activeLocale })} guide content`);
      await load();
    } catch (error: any) { message.error(error?.message || "Guide save failed"); }
  };

  const publish = async () => {
    const document = translations[activeLocale];
    if (!document?.id) { message.info("Save this locale before publishing it"); return; }
    try {
      const result: any = await api.publishGuideTranslation(document.id);
      updateActiveDocument({ ...(result?.translation || {}), status: "published" });
      message.success(`${localeName(locales.find((locale) => locale.code === activeLocale) || { code: activeLocale })} is published`);
      await load();
    } catch (error: any) { message.error(error?.message || "Publish failed"); }
  };

  const remove = async (id: number) => {
    try { await api.remove("guide-images", id); message.success("Guide deleted"); await load(); }
    catch (error: any) { message.error(error?.message || "Delete failed"); }
  };

  return <>
    <div className="bdg-filters" style={{ marginBottom: 12 }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0 }}>Guide Locale Studio</h2>
        <div style={{ color: "#8ea0bd", fontSize: 12 }}>Create and publish independent rich guide variants for every language enabled by this platform.</div>
      </div>
      <Button icon={<ReloadOutlined />} onClick={() => void load()}>Refresh</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => void openEditor()}>Create visual guide</Button>
    </div>
    <Alert showIcon type="info" style={{ marginBottom: 12 }} message="Languages come from this platform's Locale Studio" description="There is no English/Hindi special case. Add Indonesian, Burmese, Chinese, or any other BCP-47 locale in Locale Studio, then create and publish its guide variant here. A missing translation is never replaced with another platform's content." />
    <Table rowKey="id" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }} columns={[
      { title: "Guide", render: (_: any, row: any) => <div><b>{row.title}</b><div style={{ color: "#8ea0bd", fontSize: 12 }}>{row.slug}</div></div> },
      { title: "Available locales", dataIndex: "locale_coverage", render: (coverage: any) => <Space wrap>{Object.entries(coverage || {}).map(([code, status]: any) => <Tag key={code} color={status === "published" ? "green" : "gold"}>{code} · {status}</Tag>)}</Space> },
      { title: "Category", dataIndex: "category_name", width: 150 },
      { title: "Status", dataIndex: "status", width: 110, render: (value: string) => <Tag color={value === "published" ? "green" : "gold"}>{value}</Tag> },
      { title: "Actions", width: 145, render: (_: any, row: any) => <Space><Button size="small" icon={<EditOutlined />} onClick={() => void openEditor(row)}>Edit</Button><Popconfirm title="Delete this guide?" onConfirm={() => void remove(row.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
    ]} />
    <Drawer open={!!editing} onClose={close} width="min(1220px, 97vw)" title={editing?.id ? `Edit visual guide — ${editing.title}` : "Create visual guide"} extra={<Space><Button onClick={close}>Cancel</Button><Button icon={<SaveOutlined />} type="primary" onClick={() => void save()}>Save locale</Button><Button disabled={!activeDocument.id || activeDocument.status === "published"} onClick={() => void publish()}>Publish locale</Button></Space>}>
      <Form form={form} layout="vertical">
        <Alert showIcon type="info" icon={<GlobalOutlined />} style={{ marginBottom: 14 }} message="Each locale is an independent guide document" description="Write the title, summary, rich content, images, SEO fields, and cover image for the selected locale. Publishing English does not publish Indonesian, and vice versa." />
        <Row gutter={12}>
          <Col xs={24} md={8}><Form.Item label="Guide locale" required><Select value={activeLocale || defaultLocale} onChange={setActiveLocale} options={locales.map((locale) => ({ value: locale.code, label: `${localeName(locale)}${locale.is_default ? " · default" : ""}` }))} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="slug" label="Stable slug" rules={[{ required: true }]}><Input placeholder="deposit-not-received" /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="category_id" label="Category"><Select allowClear options={categories.map((category) => ({ value: category.id, label: category.name }))} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} md={12}><Form.Item name="title" label={`${localeName(locales.find((locale) => locale.code === activeLocale) || { code: activeLocale })} title`} rules={[{ required: true }]}><Input onChange={(event) => updateActiveDocument({ title: event.target.value })} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="summary" label="Summary"><Input onChange={(event) => updateActiveDocument({ summary: event.target.value })} /></Form.Item></Col>
        </Row>
        <RichKnowledgeEditor value={editorJson} onChange={(json, html) => { setEditorJson(json); setEditorHtml(html); updateActiveDocument({ rich_json: json, rich_html: html, body: plainText(html) }); }} uploadImage={uploadImage} />
        <Row gutter={12} style={{ marginTop: 14 }}>
          <Col xs={24} md={12}><Form.Item name="keywords" label="Search keywords"><Input placeholder="deposit, pending, recharge" onChange={(event) => updateActiveDocument({ keywords: event.target.value })} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="cover_image_url" label={`${localeName(locales.find((locale) => locale.code === activeLocale) || { code: activeLocale })} cover image`}><Input addonAfter={<Upload showUploadList={false} beforeUpload={uploadCover}><Button size="small" icon={<UploadOutlined />}>Upload</Button></Upload>} onChange={(event) => updateActiveDocument({ cover_image_url: event.target.value })} /></Form.Item>{activeDocument.cover_image_url && <Image src={activeDocument.cover_image_url} width={220} />}</Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} md={8}><Form.Item name="status" label="Locale status"><Select options={["draft", "published", "archived"].map((value) => ({ value, label: value }))} onChange={(value) => updateActiveDocument({ status: value })} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="priority" label="Sort order"><InputNumber min={1} max={9999} style={{ width: "100%" }} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="button_ids" label="Recommended buttons"><Select mode="multiple" optionFilterProp="label" options={buttons.filter((button) => button.status === "active").map((button) => ({ value: button.id, label: `${button.label} — ${button.action_type}` }))} /></Form.Item></Col>
        </Row>
        <Row gutter={12}><Col xs={24} md={8}><Form.Item name="seo_title" label="SEO title"><Input /></Form.Item></Col><Col xs={24} md={8}><Form.Item name="seo_description" label="SEO description"><Input /></Form.Item></Col><Col xs={24} md={8}><Form.Item name="alt_text" label="Image alt text"><Input /></Form.Item></Col></Row>
      </Form>
    </Drawer>
  </>;
}
