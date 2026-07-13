import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Alert, Button, Col, Drawer, Form, Image, Input, InputNumber, Popconfirm, Row, Select, Space, Table, Tabs, Tag, Upload, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, TranslationOutlined, UploadOutlined } from "@ant-design/icons";
import RichKnowledgeEditor from "@/components/RichKnowledgeEditor";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/guide-images")({ component: VisualGuideStudio });
const blankDocument = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

function editorValue(json: unknown, html: unknown, text: unknown) {
  if (typeof json === "string" && json.trim()) {
    try { if (JSON.parse(json)?.type === "doc") return json; } catch {}
  }
  return String(html || text || "") || blankDocument;
}
function plainText(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const node = document.createElement("div"); node.innerHTML = html; return (node.textContent || "").replace(/\s+/g, " ").trim();
}

function VisualGuideStudio() {
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [buttons, setButtons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [jsonEn, setJsonEn] = useState(blankDocument);
  const [htmlEn, setHtmlEn] = useState("");
  const [jsonHi, setJsonHi] = useState(blankDocument);
  const [htmlHi, setHtmlHi] = useState("");
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [guides, categoryRows, actionRows] = await Promise.all([api.list("guide-images"), api.list("categories"), api.list("action-buttons")]);
      setRows(guides as any[]); setCategories(categoryRows as any[]); setButtons(actionRows as any[]);
    } catch (error: any) { message.error(error?.message || "Failed to load Visual Guide Studio"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openEditor = (row?: any) => {
    const value = row || { title:"", title_hi:"", slug:"", status:"draft", language:"en", priority:100, button_ids:[] };
    setEditing(value);
    setJsonEn(editorValue(value.body_blocks_json, value.body_html, value.body));
    setHtmlEn(value.body_html || "");
    setJsonHi(editorValue(value.body_blocks_json_hi, value.body_html_hi, value.body_hi));
    setHtmlHi(value.body_html_hi || "");
    form.setFieldsValue(value);
  };
  const close = () => { setEditing(null); form.resetFields(); };
  const save = async () => {
    const values = await form.validateFields();
    const payload = { ...values, body:plainText(htmlEn), body_hi:plainText(htmlHi), body_html:htmlEn, body_html_hi:htmlHi, body_blocks_json:jsonEn, body_blocks_json_hi:jsonHi };
    try {
      if (editing?.id) await api.update("guide-images", editing.id, payload); else await api.create("guide-images", payload);
      message.success(editing?.id ? "Visual guide updated" : "Visual guide created"); close(); await load();
    } catch (error: any) { message.error(error?.message || "Save failed"); }
  };
  const uploadImage = async (file: File) => (await api.upload(file)).url;
  const uploadField = async (file: File, field: string) => {
    try { form.setFieldValue(field, await uploadImage(file)); message.success("Image uploaded"); }
    catch (error: any) { message.error(error?.message || "Upload failed"); }
    return false;
  };
  const copyEnglish = () => {
    setJsonHi(jsonEn); setHtmlHi(htmlEn);
    form.setFieldsValue({ title_hi:form.getFieldValue("title_hi") || form.getFieldValue("title"), summary_hi:form.getFieldValue("summary_hi") || form.getFieldValue("summary") });
    message.success("English layout copied. Translate the Hindi/Indian text and replace images as needed.");
  };
  const remove = async (id: number) => { try { await api.remove("guide-images", id); message.success("Guide deleted"); await load(); } catch (error:any) { message.error(error?.message || "Delete failed"); } };

  return <>
    <div className="bdg-filters" style={{ marginBottom:12 }}>
      <div style={{ flex:1 }}><h2 style={{ margin:0 }}>Multilingual Visual Guide Studio</h2><div style={{ color:"#8ea0bd",fontSize:12 }}>Create English and Hindi/Indian guides with rich text, color, images, tables, links, and reusable buttons.</div></div>
      <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={()=>openEditor()}>Create visual guide</Button>
    </div>
    <Alert showIcon type="info" style={{ marginBottom:12 }} message="The previous manual block form has been replaced" description="Edit the guide like a document. Inline images are stored in R2, and published content is rendered from safe structured editor data." />
    <Table rowKey="id" loading={loading} dataSource={rows} pagination={{ pageSize:20 }} columns={[
      { title:"Guide", render:(_:any,row:any)=><div><b>{row.title}</b><div style={{ color:"#8ea0bd",fontSize:12 }}>{row.slug}</div></div> },
      { title:"Hindi / Indian", dataIndex:"title_hi" },
      { title:"Category", dataIndex:"category_name", width:150 },
      { title:"Version", dataIndex:"version_number", width:90, render:(v:any)=><Tag>v{v || 1}</Tag> },
      { title:"Status", dataIndex:"status", width:110, render:(v:string)=><Tag color={v === "published" ? "green" : "gold"}>{v}</Tag> },
      { title:"Actions", width:145, render:(_:any,row:any)=><Space><Button size="small" icon={<EditOutlined />} onClick={()=>openEditor(row)}>Edit</Button><Popconfirm title="Delete this guide?" onConfirm={()=>remove(row.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
    ]} />
    <Drawer open={!!editing} onClose={close} width="min(1220px, 97vw)" title={editing?.id ? `Edit visual guide — ${editing.title}` : "Create visual guide"} extra={<Space><Button icon={<TranslationOutlined />} onClick={copyEnglish}>Copy EN to Hindi</Button><Button onClick={close}>Cancel</Button><Button type="primary" onClick={save}>Save</Button></Space>}>
      <Form form={form} layout="vertical">
        <Tabs items={[
          { key:"en",label:"English Visual Guide",children:<><Row gutter={12}><Col xs={24} md={12}><Form.Item name="title" label="English title" rules={[{required:true}]}><Input /></Form.Item></Col><Col xs={24} md={12}><Form.Item name="summary" label="English summary"><Input /></Form.Item></Col></Row><RichKnowledgeEditor value={jsonEn} onChange={(json,html)=>{setJsonEn(json);setHtmlEn(html);}} uploadImage={uploadImage} /></> },
          { key:"hi",label:"Hindi / Indian Visual Guide",children:<><Row gutter={12}><Col xs={24} md={12}><Form.Item name="title_hi" label="Hindi / Indian title"><Input /></Form.Item></Col><Col xs={24} md={12}><Form.Item name="summary_hi" label="Hindi / Indian summary"><Input /></Form.Item></Col></Row><RichKnowledgeEditor value={jsonHi} onChange={(json,html)=>{setJsonHi(json);setHtmlHi(html);}} uploadImage={uploadImage} /></> },
          { key:"buttons",label:"Recommended buttons",children:<><Alert showIcon type="info" style={{ marginBottom:12 }} message="These approved buttons appear with this guide and may also be recommended by AI."/><Form.Item name="button_ids" label="Guide buttons"><Select mode="multiple" optionFilterProp="label" options={buttons.filter((button)=>button.status === "active").map((button)=>({value:button.id,label:`${button.label} — ${button.action_type}`}))} /></Form.Item></> },
          { key:"settings",label:"Publishing & metadata",children:<><Row gutter={12}><Col xs={24} md={12}><Form.Item name="slug" label="Slug" rules={[{required:true}]}><Input placeholder="deposit-not-received" /></Form.Item></Col><Col xs={24} md={12}><Form.Item name="category_id" label="Category"><Select allowClear options={categories.map((category)=>({value:category.id,label:category.name}))} /></Form.Item></Col></Row><Form.Item name="keywords" label="Search keywords"><Input placeholder="Used by Guide search—not AI routing" /></Form.Item><Row gutter={12}><Col xs={12} md={6}><Form.Item name="status" label="Status"><Select options={["draft","published","archived"].map(value=>({value,label:value}))} /></Form.Item></Col><Col xs={12} md={6}><Form.Item name="language" label="Default language"><Select options={[{value:"en",label:"English"},{value:"hi",label:"Hindi"}]} /></Form.Item></Col><Col xs={12} md={6}><Form.Item name="priority" label="Sort order"><InputNumber min={1} max={9999} style={{ width:"100%" }} /></Form.Item></Col></Row><Form.Item name="cover_image_url" label="English cover image"><Input addonAfter={<Upload showUploadList={false} beforeUpload={(file)=>uploadField(file,"cover_image_url")}><Button size="small" icon={<UploadOutlined />}>Upload</Button></Upload>} /></Form.Item>{form.getFieldValue("cover_image_url") && <Image src={form.getFieldValue("cover_image_url")} width={220} />}<Form.Item name="cover_image_url_hi" label="Hindi / Indian cover image"><Input addonAfter={<Upload showUploadList={false} beforeUpload={(file)=>uploadField(file,"cover_image_url_hi")}><Button size="small" icon={<UploadOutlined />}>Upload</Button></Upload>} /></Form.Item></> },
        ]} />
      </Form>
    </Drawer>
  </>;
}
