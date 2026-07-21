import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Card, Progress, Space, Table, Tag, Upload, message } from "antd";
import { CloudUploadOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { api, getActiveAdminPlatformRoute } from "@/lib/api";
import LocalizedHelp from "@/components/LocalizedHelp";

export const Route = createFileRoute("/_admin/ai-knowledge-import")({ component: AiKnowledgeImportPage });

function AiKnowledgeImportPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async () => { setLoading(true); try { setBatches((await api.listKnowledgeImports()) as any[]); } catch (error: any) { message.error(error?.message || "Could not load imports"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const preview = async (file: File) => { setBusy(true); try { const value = await api.previewKnowledgeImport(file, getActiveAdminPlatformRoute() || "default"); setCurrent(value); message.success("Workbook preview is ready"); } catch (error: any) { message.error(error?.message || "Import preview failed"); } finally { setBusy(false); } return false; };
  const act = async (name: "drafts" | "approve" | "publish" | "rollback") => { if (!current?.id) return; setBusy(true); try { const value = name === "drafts" ? await api.createKnowledgeImportDrafts(current.id) : name === "approve" ? await api.approveKnowledgeImportBatch(current.id) : name === "publish" ? await api.publishKnowledgeImportBatch(current.id) : await api.rollbackKnowledgeImport(current.id); message.success(`${name} completed`); if (value?.batch_id) setCurrent((old: any) => ({ ...old, ...value })); await load(); } catch (error: any) { message.error(error?.message || `${name} failed`); } finally { setBusy(false); } };
  const columns = [
    { title: "Name", dataIndex: ["mapped", "content_name"], render: (_: any, row: any) => row.name || row.mapped?.content_name || row.mapped?.title },
    { title: "Question", dataIndex: ["mapped", "question"] },
    { title: "Locale", dataIndex: ["mapped", "locale"], render: (v: string) => <Tag>{String(v || "en").toUpperCase()}</Tag> },
    { title: "Validation", dataIndex: "status", render: (v: string, row: any) => <Space direction="vertical"><Tag color={v === "valid" ? "green" : "red"}>{v}</Tag>{row.validation_error ? <span style={{ color: "#ff9c9c" }}>{row.validation_error}</span> : null}</Space> },
    { title: "Approval", dataIndex: "approval_status", render: (v: string) => <Tag color={v === "approved" ? "green" : "gold"}>{v || "pending"}</Tag> },
  ];
  return <>
    <LocalizedHelp copies={{
      en: { title: "AI Knowledge Import is a controlled release workflow", body: "Download the named template, preview the workbook, create drafts, review them, approve the batch, publish it, and use rollback to restore the previous release. Imported rows never route to AI while they are drafts.", bullets: ["Use one locale code per row (for example en-US, id-ID, zh-CN, or my-MM).", "Images are references for review; verify them in the visual editor before publishing."] },
      zh: { title: "AI 知识导入是受控的发布流程", body: "先下载模板，再预览工作簿、创建草稿、检查内容、批准批次并发布。草稿状态不会进入 AI 路由；需要回滚时可以恢复上一个发布版本。", bullets: ["每行使用一个语言代码，例如 en-US、id-ID、zh-CN 或 my-MM。", "图片只是审核参考，发布前请在可视化编辑器中确认。"] },
      my: { title: "AI အသိပညာတင်သွင်းမှုသည် ထိန်းချုပ်ထားသော ထုတ်ဝေမှုလုပ်ငန်းစဉ်ဖြစ်သည်", body: "Template ကို ဒေါင်းလုဒ်လုပ်ပြီး workbook ကို ကြိုတင်ကြည့်ပါ၊ draft ဖန်တီးပါ၊ စစ်ဆေးပြီး batch ကို အတည်ပြုကာ ထုတ်ဝေပါ။ Draft များကို AI က မသုံးပါ။ လိုအပ်ပါက ယခင်ထုတ်ဝေမှုသို့ rollback လုပ်နိုင်သည်။", bullets: ["Row တစ်ကြောင်းစီတွင် en-US၊ id-ID၊ zh-CN သို့မဟုတ် my-MM ကဲ့သို့ locale code တစ်ခု သုံးပါ။", "ပုံများကို စစ်ဆေးရေးအတွက်သာ သုံးပြီး ထုတ်ဝေမီ visual editor တွင် အတည်ပြုပါ။"] },
    }} />
    <Card title="Import workbook" extra={<Space><Button icon={<DownloadOutlined />} onClick={() => void api.downloadKnowledgeImportTemplate()}>Download template</Button><Button icon={<ReloadOutlined />} onClick={() => void load()}>Refresh</Button></Space>}>
      <Upload.Dragger accept=".xlsx" showUploadList={false} beforeUpload={preview} disabled={busy}><p className="ant-upload-drag-icon"><CloudUploadOutlined /></p><p>Drop an .xlsx workbook here or click to select it</p><p style={{ color: "#8ea0bd" }}>Required: Name, Question, How to reply / Answer. Optional: Locale, images, image role, AI instruction, examples, ticket, platform.</p></Upload.Dragger>
      {current ? <Card size="small" style={{ marginTop: 16 }} title={`Review — ${current.filename}`}><Space wrap><Tag>Rows: {current.total_rows}</Tag><Tag color="green">Valid: {current.valid_rows}</Tag><Tag color={current.error_rows ? "red" : "green"}>Issues: {current.error_rows}</Tag><Tag>{current.status}</Tag></Space><Progress percent={Number(current.progress_percent || 0)} status={current.status === "error" ? "exception" : "normal"} style={{ marginTop: 12 }} /><Space wrap style={{ marginTop: 12 }}><Button loading={busy} onClick={() => void act("drafts")}>Create drafts</Button><Button loading={busy} onClick={() => void act("approve")}>Approve batch</Button><Button type="primary" loading={busy} onClick={() => void act("publish")}>Publish batch</Button><Button danger loading={busy} onClick={() => void act("rollback")}>Rollback release</Button></Space><Table style={{ marginTop: 16 }} rowKey="id" dataSource={current.preview_rows || []} columns={columns as any} pagination={{ pageSize: 10 }} /></Card> : null}
    </Card>
    <Card title="Import history" style={{ marginTop: 12 }}><Table loading={loading} rowKey="id" dataSource={batches} columns={[{ title: "Workbook", dataIndex: "filename" }, { title: "Status", dataIndex: "status", render: (v: string) => <Tag>{v}</Tag> }, { title: "Rows", dataIndex: "total_rows" }, { title: "Valid", dataIndex: "valid_rows" }, { title: "Created", dataIndex: "created_at" }]} onRow={(row) => ({ onClick: async () => { try { setCurrent(await api.getKnowledgeImport(row.id)); } catch (error: any) { message.error(error?.message || "Could not open import"); } } })} pagination={{ pageSize: 8 }} /></Card>
  </>;
}
