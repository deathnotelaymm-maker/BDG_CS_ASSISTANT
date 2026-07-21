import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Descriptions, Space, Table, Tag, Typography, message } from "antd";
import { GlobalOutlined, ReloadOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import LocalizedHelp from "@/components/LocalizedHelp";

export const Route = createFileRoute("/_admin/domain-mapping")({ component: DomainMappingPage });

function DomainMappingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = async () => { setLoading(true); try { setData(await api.getDomainMapping()); } catch (error: any) { message.error(error?.message || "Could not load domain mapping"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const generate = async () => { setBusy(true); try { setData(await api.generateDomainMapping()); message.success("Generated platform links refreshed"); } catch (error: any) { message.error(error?.message || "Could not generate links"); } finally { setBusy(false); } };
  const verify = async (id: number) => { setBusy(true); try { await api.verifyMappedDomain(id); message.info("DNS verification instructions updated"); await load(); } catch (error: any) { message.error(error?.message || "Could not start verification"); } finally { setBusy(false); } };
  const link = (value?: string) => value ? <Typography.Link href={value} target="_blank" rel="noreferrer">{value}</Typography.Link> : "—";
  return <>
    <LocalizedHelp copies={{
      en: { title: "Production domain mapping", body: "Every platform receives stable generated Chat, Guide, and Admin routes under the shared Pages origins. A custom domain is optional and must be configured in Cloudflare Pages first; this screen records the mapping and verification state but never changes DNS automatically.", bullets: ["Generated route: https://...pages.dev/p/<platform-route>", "Custom domain: add the hostname in Cloudflare Pages, configure DNS, then use Verify to record the pending DNS check.", "Keep the platform route in links and embeds so a later custom domain can be changed without moving tenant content."] },
      zh: { title: "生产环境域名映射", body: "每个平台都会获得稳定的 Chat、Guide 和 Admin 生成链接，使用共享 Pages 域名。自定义域名是可选的，必须先在 Cloudflare Pages 中配置；此页面只记录映射和验证状态，不会自动修改 DNS。", bullets: ["生成链接格式：https://...pages.dev/p/<平台路由>", "自定义域名：先在 Cloudflare Pages 添加主机名并配置 DNS，再点击验证。", "在对外链接中保留平台路由，以后更换域名时不需要迁移租户内容。"] },
      my: { title: "ထုတ်လုပ်ရေး ဒိုမိန်းချိတ်ဆက်မှု", body: "Platform တစ်ခုချင်းစီအတွက် shared Pages origin အောက်တွင် Chat၊ Guide နှင့် Admin generated link များ ရှိသည်။ Custom domain သည် ရွေးချယ်နိုင်ပြီး Cloudflare Pages တွင် အရင်ပြင်ဆင်ရမည်။ ဤစာမျက်နှာသည် mapping နှင့် verification အခြေအနေကိုသာ မှတ်တမ်းတင်ပြီး DNS ကို အလိုအလျောက် မပြောင်းပါ။", bullets: ["Generated route ပုံစံ: https://...pages.dev/p/<platform-route>", "Custom domain အတွက် Cloudflare Pages တွင် hostname နှင့် DNS ထည့်ပြီး Verify ကိုနှိပ်ပါ။", "External link များတွင် platform route ကို ထားပါက နောက်ပိုင်း domain ပြောင်းလဲရာတွင် tenant content မရွှေ့ရပါ။"] },
    }} />
    <Card loading={loading} title={<Space><GlobalOutlined />Generated platform access links</Space>} extra={<Space><Button icon={<ReloadOutlined />} onClick={() => void load()}>Refresh</Button><Button type="primary" loading={busy} onClick={() => void generate()}>Generate links</Button></Space>}>
      {data ? <Descriptions bordered column={1}><Descriptions.Item label="Chat">{link(data.generated?.chat)}</Descriptions.Item><Descriptions.Item label="Guide">{link(data.generated?.guide)}</Descriptions.Item><Descriptions.Item label="Admin">{link(data.generated?.admin)}</Descriptions.Item><Descriptions.Item label="Platform route">{data.platform?.route_prefix || "—"}</Descriptions.Item></Descriptions> : null}
    </Card>
    <Card title="Custom domains" style={{ marginTop: 12 }}><Alert showIcon type="warning" message="DNS is never changed automatically" description={data?.dns?.custom_domain || "Add the hostname in Cloudflare Pages, then verify it here."} style={{ marginBottom: 12 }} /><Table rowKey="id" dataSource={data?.custom_domains || []} columns={[{ title: "Site", dataIndex: "site_kind" }, { title: "Hostname", dataIndex: "hostname" }, { title: "Status", dataIndex: "provisioning_status", render: (v: string) => <Tag color={v === "verified" || v === "active" ? "green" : "gold"}>{v || "pending"}</Tag> }, { title: "Action", render: (_: any, row: any) => <Button size="small" icon={<SafetyCertificateOutlined />} loading={busy} onClick={() => void verify(row.id)}>Verify DNS</Button> }]} pagination={false} /></Card>
  </>;
}
