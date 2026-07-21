import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Input, InputNumber, Select, Space, Switch, Table, Tag, message } from "antd";
import { ApartmentOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import LocalizedHelp from "@/components/LocalizedHelp";

export const Route = createFileRoute("/_admin/ai-source-router")({ component: AiSourceRouterPage });

const sourceOptions = [
  { value: "prompt_image", label: "AI Prompt & Image" },
  { value: "qa", label: "AI Q&A" },
  { value: "faq", label: "FAQ" },
  { value: "guide", label: "Guide" },
  { value: "knowledge", label: "Knowledge" },
];

function AiSourceRouterPage() {
  const [router, setRouter] = useState<any>({ enabled: true, prompt_manager_enabled: true, source_order: sourceOptions.map((item) => item.value), enabled_sources: sourceOptions.map((item) => item.value), locale_strategy: "exact_then_base", max_candidates: 80 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messageText, setMessageText] = useState("My deposit has not arrived");
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRouter(await api.getAiSourceRouter()); }
    catch (error: any) { message.error(error?.message || "Could not load AI Source Router"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true);
    try { setRouter(await api.updateAiSourceRouter({ enabled: router.enabled !== false, prompt_manager_enabled: router.prompt_manager_enabled !== false, source_order: router.source_order || sourceOptions.map((item) => item.value), enabled_sources: router.enabled_sources || sourceOptions.map((item) => item.value), locale_strategy: router.locale_strategy || "exact_then_base", max_candidates: Number(router.max_candidates || 80) })); message.success("AI source routing policy saved"); }
    catch (error: any) { message.error(error?.message || "Could not save AI source routing policy"); }
    finally { setSaving(false); }
  };
  const runPreview = async () => {
    if (!messageText.trim()) { message.error("Enter a customer message to preview"); return; }
    setPreviewing(true);
    try { setPreview(await api.previewAiSourceRouter(messageText)); }
    catch (error: any) { message.error(error?.message || "Could not preview source routing"); }
    finally { setPreviewing(false); }
  };
  const sourceColumns = useMemo(() => [
    { title: "Source", dataIndex: "source_type", render: (value: string) => <Tag color="blue">{sourceOptions.find((item) => item.value === value)?.label || value}</Tag> },
    { title: "Title", dataIndex: "title" },
    { title: "Intent", dataIndex: "intent_key" },
    { title: "Locale", dataIndex: "locale", render: (value: string) => String(value || "all").toUpperCase() },
  ], []);

  return <>
    <Card loading={loading} title={<Space><ApartmentOutlined />Unified AI Source Router</Space>} extra={<Button icon={<ReloadOutlined />} onClick={() => void load()}>Refresh</Button>} style={{ marginBottom: 12 }}>
      <LocalizedHelp copies={{
        en: { title: "One deterministic policy for every approved AI source", body: "The live AI can use AI Prompt & Image, AI Q&A, FAQ, published Guide translations, and Knowledge. Every candidate is scoped to the current tenant and platform; drafts, archived items, and cross-platform content are never routed. This replaces silent BDG/default fallback.", bullets: ["Enabled sources are eligible; source order decides which approved answer wins.", "Use Preview to see the exact sources the current tenant and platform can use."] },
        zh: { title: "所有已批准 AI 来源使用一套确定性策略", body: "在线 AI 可以使用 AI 提示与图片、AI 问答、FAQ、已发布的指南翻译和知识内容。所有候选内容都限制在当前租户和平台，草稿、归档以及其他平台的内容不会被路由。", bullets: ["启用的来源才有资格参与；来源顺序决定优先回答。", "使用预览查看当前租户和平台实际可使用的内容。"] },
        my: { title: "အတည်ပြုပြီးသော AI ရင်းမြစ်အားလုံးအတွက် တိကျသော မူဝါဒတစ်ခု", body: "Live AI သည် AI Prompt & Image၊ AI Q&A၊ FAQ၊ ထုတ်ဝေပြီး Guide ဘာသာပြန်များနှင့် Knowledge ကို အသုံးပြုနိုင်သည်။ Candidate အားလုံးကို လက်ရှိ tenant နှင့် platform အတွင်းသာ ကန့်သတ်ထားပြီး draft၊ archive နှင့် အခြား platform အကြောင်းအရာများကို မပို့ပါ။", bullets: ["ဖွင့်ထားသော source များသာ ပါဝင်မည်၊ source order က ဦးစားပေးအဖြေကို ဆုံးဖြတ်မည်။", "Preview ဖြင့် လက်ရှိ tenant/platform သုံးနိုင်သည့် source အတိအကျကို ကြည့်ပါ။"] },
      }} />
      <Space direction="vertical" style={{ width: "100%", marginTop: 16 }} size="middle">
        <Space wrap><span>Router enabled</span><Switch checked={router.enabled !== false} onChange={(value) => setRouter((current: any) => ({ ...current, enabled: value }))} /><span>Prompt Manager global instructions</span><Switch checked={router.prompt_manager_enabled !== false} onChange={(value) => setRouter((current: any) => ({ ...current, prompt_manager_enabled: value }))} /></Space>
        <label>Source priority order <Select mode="multiple" value={router.source_order || []} onChange={(value) => setRouter((current: any) => ({ ...current, source_order: value }))} options={sourceOptions} style={{ width: "100%" }} /></label>
        <label>Enabled sources <Select mode="multiple" value={router.enabled_sources || router.source_order || []} onChange={(value) => setRouter((current: any) => ({ ...current, enabled_sources: value }))} options={sourceOptions} style={{ width: "100%" }} /></label>
        <Alert showIcon type="warning" message="Removing a source pauses it for this platform only" description="It is not deleted. Re-enable it here whenever the platform should use that source again. No source falls back to BDG or another tenant." />
        <Space wrap><label>Locale matching <Select value={router.locale_strategy || "exact_then_base"} onChange={(value) => setRouter((current: any) => ({ ...current, locale_strategy: value }))} options={[{ value: "exact_then_base", label: "Exact locale, then base language" }, { value: "exact_only", label: "Exact locale only" }]} style={{ width: 260 }} /></label><label>Maximum candidates <InputNumber min={10} max={200} value={router.max_candidates || 80} onChange={(value) => setRouter((current: any) => ({ ...current, max_candidates: value || 80 }))} /></label><Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void save()}>Save policy</Button></Space>
      </Space>
    </Card>
    <Card title="Explain a routing decision" style={{ marginBottom: 12 }}>
      <Space.Compact style={{ display: "flex" }}><Input value={messageText} onChange={(event) => setMessageText(event.target.value)} onPressEnter={() => void runPreview()} placeholder="Enter the customer message" /><Button type="primary" loading={previewing} onClick={() => void runPreview()}>Preview</Button></Space.Compact>
      {preview ? <><Alert showIcon type="success" message={`${preview.candidate_catalog_size || 0} eligible candidates`} description={<Space wrap>{Object.entries(preview.source_counts || {}).map(([key, value]) => <Tag key={key}>{sourceOptions.find((item) => item.value === key)?.label || key}: {String(value)}</Tag>)}</Space>} style={{ marginTop: 12 }} /><Table rowKey={(row: any) => `${row.source_type}-${row.id}`} size="small" pagination={{ pageSize: 8 }} dataSource={preview.candidates || []} columns={sourceColumns as any} style={{ marginTop: 12 }} /></> : <p style={{ color: "#8ea0bd", marginTop: 12, marginBottom: 0 }}>Preview shows only the tenant/platform-scoped published sources that the AI can see.</p>}
    </Card>
    <Card size="small" title="Publishing contract"><p style={{ marginBottom: 0 }}>Import and editor drafts do not route. Approve and publish the source in its own studio first. Locale selection follows the platform Locale Registry, so Indonesian, Burmese, Chinese, or any enabled BCP-47 language is treated as a real locale—not Hindi fallback.</p></Card>
  </>;
}
