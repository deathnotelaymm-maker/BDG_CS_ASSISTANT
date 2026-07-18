import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Space, Table, Tag, message } from "antd";
import { GlobalOutlined, ReloadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

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

  const load = async () => {
    setLoading(true);
    try { setData(await api.getLocaleStudio()); }
    catch (error: any) { message.error(error?.message || "Could not load Locale Studio"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

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
    <Card title={<Space><GlobalOutlined />Locale-Aware Knowledge Studio</Space>} extra={<Button icon={<ReloadOutlined />} onClick={() => void load()}>Refresh</Button>} loading={loading} style={{ marginBottom: 12 }}>
      <Alert showIcon type="info" message={`Platform languages: ${locales || "not configured"}`} description={`Default locale: ${(data.platform?.default_locale || "en").toUpperCase()}. Imports and AI Q&A drafts must use an enabled locale. Exact locale is preferred, base-language matching is allowed, and unsupported locales are rejected.`} />
      <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
        <div><b>{data.summary?.intent_count || 0}</b><div>Intents</div></div>
        <div><b>{data.summary?.complete_intents || 0}</b><div>Complete</div></div>
        <div><b>{data.summary?.missing_translations || 0}</b><div>Missing translations</div></div>
        <div><b>{data.summary?.published_items || 0}</b><div>Published Q&A</div></div>
      </div>
    </Card>
    <Card title="Locale coverage" style={{ marginBottom: 12 }}>
      <Table rowKey="intent_key" loading={loading} dataSource={data.coverage || []} columns={columns as any} pagination={{ pageSize: 20 }} scroll={{ x: 900 }} />
    </Card>
    <Card size="small" title="Publishing rule">
      <p style={{ marginBottom: 0 }}>Creating a translation only creates a draft. Open AI Q&amp;A, write or review the localized answer and visual steps, then approve and publish it. The live AI never uses draft or unsupported-locale content.</p>
    </Card>
  </>;
}
