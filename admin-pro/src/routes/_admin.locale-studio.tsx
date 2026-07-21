import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Input, Select, Space, Table, Tag, message } from "antd";
import { GlobalOutlined, ReloadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
<<<<<<< Updated upstream
=======
import LocalizedHelp from "@/components/LocalizedHelp";
>>>>>>> Stashed changes

export const Route = createFileRoute("/_admin/locale-studio")({ component: LocaleStudioPage });

function statusTag(value: any) {
  if (value?.published) return <Tag color="green">Published</Tag>;
  if (value?.status === "missing") return <Tag color="red">Missing</Tag>;
  return <Tag color="gold">Draft</Tag>;
}

function LocaleStudioPage() {
  const [data, setData] = useState<any>({ locales: [], coverage: [], summary: {}, platform: {} });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [registry, setRegistry] = useState<any>({ default_locale: "en", supported_languages: [], locales: [] });
  const [localeText, setLocaleText] = useState("");
  const [savingRegistry, setSavingRegistry] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [studio, nextRegistry] = await Promise.all([api.getLocaleStudio(), api.getLocaleRegistry()]);
      setData(studio);
      setRegistry(nextRegistry || {});
      setLocaleText((nextRegistry?.supported_languages || []).join(", "));
    } catch (error: any) { message.error(error?.message || "Could not load Locale Studio"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const saveRegistry = async () => {
    const supported_languages = [...new Set(localeText.split(/[,s]+/).map((value) => value.trim().toLowerCase()).filter(Boolean))];
    if (!supported_languages.length) { message.error("Add at least one locale code, such as en, my-MM, or zh-CN"); return; }
    setSavingRegistry(true);
    try {
      const result = await api.updateLocaleRegistry({
        default_locale: registry.default_locale || supported_languages[0],
        supported_languages,
        locales: supported_languages.map((code) => ({
          code,
          label: registry.locales?.find((locale: any) => locale.code === code)?.label || code,
        })),
      });
      setRegistry(result);
      setLocaleText((result.supported_languages || supported_languages).join(", "));
      message.success("Platform locale registry saved");
      await load();
    } catch (error: any) { message.error(error?.message || "Could not save platform locales"); }
    finally { setSavingRegistry(false); }
  };

  const createDraft = async (sourceId: number, locale: string) => {
    const key = `${sourceId}:${locale}`;
    setCreating(key);
    try { await api.createLocaleTranslation(sourceId, locale); message.success(`Created ${locale.toUpperCase()} translation draft`); await load(); }
    catch (error: any) { message.error(error?.message || "Could not create translation draft"); }
    finally { setCreating(null); }
  };

  const columns = useMemo(() => {
    const localeColumns = (data.locales || []).map((locale: any) => ({
      title: locale.code.toUpperCase(),
      key: locale.code,
      width: 125,
      render: (_: any, row: any) => {
        const item = row.locales?.[locale.code] || { status: "missing" };
        return <Space size={4}>{statusTag(item)}{item.status === "missing" && row.source_id ? <Button size="small" loading={creating === `${row.source_id}:${locale.code}`} onClick={() => void createDraft(row.source_id, locale.code)}>Create draft</Button> : null}</Space>;
      },
    }));
    return [
      { title: "Intent", dataIndex: "intent_key", width: 220, render: (value: string, row: any) => <div><b>{row.title}</b><div style={{ color: "#8ea0bd", fontSize: 12 }}>{value}</div></div> },
      ...localeColumns,
      { title: "Coverage", key: "coverage", width: 110, render: (_: any, row: any) => row.complete ? <Tag color="green">Complete</Tag> : <Tag color="orange">{row.missing_locales?.length || 0} missing</Tag> },
    ];
  }, [data.locales, creating]);

  const locales = (data.platform?.supported_languages || []).map((code: string) => code.toUpperCase()).join(", ");
  return <>
<<<<<<< Updated upstream
=======
    <LocalizedHelp copies={{
      en: { title: "Platform Locale Studio", body: "This registry controls the languages available to this platform's Guide, FAQ, AI Q&A, and knowledge import forms. Use standard BCP-47 codes such as en-US, id-ID, zh-CN, or my-MM. The AI and Guide never use a language that is not enabled here.", bullets: ["Choose one default locale for new content.", "Add a locale before importing or publishing content in that language."] },
      zh: { title: "平台语言工作室", body: "此注册表控制当前平台的指南、FAQ、AI 问答和知识导入表单可使用的语言。请使用标准 BCP-47 代码，例如 en-US、id-ID、zh-CN 或 my-MM。AI 和指南不会使用未启用的语言。", bullets: ["为新内容选择一个默认语言。", "导入或发布某种语言的内容前，先添加该语言。"] },
      my: { title: "Platform Locale Studio", body: "ဤ registry သည် platform ၏ Guide၊ FAQ၊ AI Q&A နှင့် knowledge import form များတွင် အသုံးပြုနိုင်သော ဘာသာများကို ထိန်းချုပ်သည်။ en-US၊ id-ID၊ zh-CN သို့မဟုတ် my-MM ကဲ့သို့ BCP-47 code ကို သုံးပါ။ ဖွင့်မထားသော ဘာသာကို AI နှင့် Guide က မသုံးပါ။", bullets: ["အကြောင်းအရာအသစ်အတွက် default locale တစ်ခု ရွေးပါ။", "ထိုဘာသာဖြင့် import သို့မဟုတ် publish မလုပ်မီ locale ကို ထည့်ပါ။"] },
    }} />
>>>>>>> Stashed changes
    <Card title={<Space><GlobalOutlined />Locale-Aware Knowledge Studio</Space>} extra={<Button icon={<ReloadOutlined />} onClick={() => void load()}>Refresh</Button>} loading={loading} style={{ marginBottom: 12 }}>
      <Alert showIcon type="info" message={`Platform languages: ${locales || "not configured"}`} description={`Default locale: ${(data.platform?.default_locale || "en").toUpperCase()}. Imports and AI Q&A drafts must use an enabled locale. Exact locale is preferred, base-language matching is allowed, and unsupported locales are rejected.`} />
      <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
        <div><b>{data.summary?.intent_count || 0}</b><div>Intents</div></div>
        <div><b>{data.summary?.complete_intents || 0}</b><div>Complete</div></div>
        <div><b>{data.summary?.missing_translations || 0}</b><div>Missing translations</div></div>
        <div><b>{data.summary?.published_items || 0}</b><div>Published Q&A</div></div>
      </div>
    </Card>
    <Card title={<Space><GlobalOutlined />Platform locale registry</Space>} style={{ marginBottom: 12 }}>
      <Alert showIcon type="info" message="This list controls every locale selector for this platform" description="Enter BCP-47 locale codes separated by commas or spaces. Examples: en, my-MM, zh-CN, hi-IN, ar. A locale must be enabled here before an FAQ, AI Q&A item, or knowledge import row can be saved." style={{ marginBottom: 12 }} />
      <Space direction="vertical" style={{ width: "100%" }}>
        <Input.TextArea value={localeText} onChange={(event) => setLocaleText(event.target.value)} rows={2} placeholder="en, my-MM, zh-CN" />
        <Space>
          <span>Default locale</span>
          <Select value={registry.default_locale || undefined} onChange={(value) => setRegistry((current: any) => ({ ...current, default_locale: value }))} options={(registry.supported_languages || []).map((code: string) => ({ value: code, label: code.toUpperCase() }))} placeholder="Choose default" style={{ width: 180 }} />
          <Button type="primary" loading={savingRegistry} onClick={() => void saveRegistry()}>Save locale policy</Button>
        </Space>
      </Space>
    </Card>
    <Card title="Locale coverage" style={{ marginBottom: 12 }}>
      <Table rowKey="intent_key" loading={loading} dataSource={data.coverage || []} columns={columns as any} pagination={{ pageSize: 20 }} scroll={{ x: 900 }} />
    </Card>
    <Card size="small" title="Publishing rule">
      <p style={{ marginBottom: 0 }}>Creating a translation only creates a draft. Open AI Q&amp;A, write or review the localized answer and visual steps, then approve and publish it. The live AI never uses draft or unsupported-locale content.</p>
    </Card>
  </>;
}
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
