import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Descriptions, Form, Input, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import { DeleteOutlined, GlobalOutlined, ReloadOutlined, SafetyCertificateOutlined, SyncOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import LocalizedHelp from "@/components/LocalizedHelp";

export const Route = createFileRoute("/_admin/domain-mapping")({ component: DomainMappingPage });

function statusColor(value: string) {
  if (["active", "verified"].includes(String(value || "").toLowerCase())) return "green";
  if (["error", "disabled"].includes(String(value || "").toLowerCase())) return "red";
  return "gold";
}

function DomainMappingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setData(await api.getDomainMapping()); }
    catch (error: any) { message.error(error?.message || "Could not load domain mapping"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const generate = async () => {
    setBusy(true);
    try { setData(await api.generateDomainMapping()); message.success("Generated platform links refreshed"); }
    catch (error: any) { message.error(error?.message || "Could not generate links"); }
    finally { setBusy(false); }
  };
  const addDomain = async (values: any) => {
    setBusy(true);
    try { await api.createDomainMappingDomain(values); form.resetFields(); message.success("Domain added. Provision it through Cloudflare next."); await load(); }
    catch (error: any) { message.error(error?.message || "Could not add domain"); }
    finally { setBusy(false); }
  };
  const runDomainAction = async (action: "provision" | "sync" | "delete", id: number) => {
    setBusy(true);
    try {
      if (action === "provision") await api.provisionMappedDomain(id);
      if (action === "sync") await api.syncMappedDomain(id);
      if (action === "delete") await api.deleteMappedDomain(id);
      message.success(action === "delete" ? "Domain mapping archived" : "Cloudflare status refreshed");
      await load();
    } catch (error: any) { message.error(error?.message || "Domain action failed"); }
    finally { setBusy(false); }
  };
  const link = (value?: string) => value ? <Typography.Link href={value} target="_blank" rel="noreferrer">{value}</Typography.Link> : "—";

  const columns = [
    { title: "Site", dataIndex: "site_kind", render: (value: string) => <Tag>{String(value || "guide").toUpperCase()}</Tag> },
    { title: "Hostname", dataIndex: "hostname", render: (value: string, row: any) => <Space direction="vertical" size={0}><Typography.Text>{value}</Typography.Text>{link(row.custom_url)}</Space> },
    { title: "Provisioning", dataIndex: "provisioning_status", render: (value: string) => <Tag color={statusColor(value)}>{value || "planned"}</Tag> },
    { title: "Cloudflare", render: (_: any, row: any) => <Space direction="vertical" size={0}><span>Hostname: <Tag color={statusColor(row.cloudflare_status)}>{row.cloudflare_status || "not created"}</Tag></span><span>SSL: <Tag color={statusColor(row.cloudflare_ssl_status)}>{row.cloudflare_ssl_status || "not checked"}</Tag></span></Space> },
    { title: "Ready", render: (_: any, row: any) => row.ready ? <Tag color="green">Ready</Tag> : <Tag color="gold">DNS / SSL pending</Tag> },
    { title: "Action", render: (_: any, row: any) => <Space wrap><Button size="small" type="primary" icon={<SafetyCertificateOutlined />} loading={busy} onClick={() => void runDomainAction(row.cloudflare_hostname_id ? "sync" : "provision", row.id)}>{row.cloudflare_hostname_id ? "Refresh status" : "Provision"}</Button><Popconfirm title="Archive this domain mapping?" description="Cloudflare will be asked to remove the hostname when configured." onConfirm={() => void runDomainAction("delete", row.id)}><Button size="small" danger icon={<DeleteOutlined />} loading={busy}>Remove</Button></Popconfirm></Space> },
  ];

  return <>
    <LocalizedHelp copies={{
      en: { title: "Bring Your Own Domain", body: "The customer buys the domain from a registrar. This admin screen registers the hostname with Cloudflare Custom Hostnames and displays the exact DNS records the customer must add. The backend never stores registrar passwords and never changes DNS automatically.", bullets: ["Add a hostname such as support.example.com and choose whether it serves Chat, Guide, or Admin.", "Click Provision, copy the returned TXT ownership and certificate records, and add them at the customer's DNS provider.", "Add the displayed CNAME to the SaaS target. A domain is ready only when both Cloudflare hostname status and SSL status are active."] },
      zh: { title: "客户自有域名（BYOD）", body: "客户自己向域名注册商购买域名。本页面会通过 Cloudflare Custom Hostnames 注册主机名，并显示客户需要添加的准确 DNS 记录。后端不会保存注册商密码，也不会自动修改 DNS。", bullets: ["添加 support.example.com 这样的主机名，并选择它用于 Chat、Guide 或 Admin。", "点击 Provision，复制返回的 TXT 所有权验证记录和证书验证记录，在客户 DNS 服务商处添加。", "再添加指向 SaaS 目标的 CNAME。只有 Cloudflare 主机名状态和 SSL 状态都为 active，域名才可以正式使用。"] },
      my: { title: "ဖောက်သည်ပိုင် ဒိုမိန်း (BYOD)", body: "ဖောက်သည်သည် domain ကို registrar ထံမှ ကိုယ်တိုင်ဝယ်ယူပါသည်။ ဤစာမျက်နှာက hostname ကို Cloudflare Custom Hostnames တွင် မှတ်ပုံတင်ပြီး ဖောက်သည်ထည့်ရမည့် DNS record အတိအကျကို ပြပါမည်။ Registrar password များကို backend က မသိမ်းပါ၊ DNS ကိုလည်း အလိုအလျောက် မပြောင်းပါ။", bullets: ["support.example.com ကဲ့သို့ hostname ထည့်ပြီး Chat၊ Guide သို့မဟုတ် Admin အတွက် ရွေးပါ။", "Provision ကိုနှိပ်ပြီး ပြန်ရလာသော TXT ownership နှင့် certificate record များကို ဖောက်သည်၏ DNS provider တွင် ထည့်ပါ။", "SaaS target သို့ ညွှန်သော CNAME ကိုလည်း ထည့်ပါ။ Cloudflare hostname status နှင့် SSL status နှစ်ခုလုံး active ဖြစ်မှ domain အသင့်ဖြစ်ပါမည်။"] },
    }} />

    <Card loading={loading} title={<Space><GlobalOutlined />Generated platform access links</Space>} extra={<Space><Button icon={<ReloadOutlined />} onClick={() => void load()}>Refresh</Button><Button type="primary" loading={busy} onClick={() => void generate()}>Generate links</Button></Space>}>
      {data ? <Descriptions bordered column={1}><Descriptions.Item label="Chat">{link(data.generated?.chat)}</Descriptions.Item><Descriptions.Item label="Guide">{link(data.generated?.guide)}</Descriptions.Item><Descriptions.Item label="Admin">{link(data.generated?.admin)}</Descriptions.Item><Descriptions.Item label="Platform route">{data.platform?.route_prefix || "—"}</Descriptions.Item></Descriptions> : null}
    </Card>

    <Card title="Cloudflare Custom Hostnames" style={{ marginTop: 12 }}>
      <Alert showIcon type={data?.cloudflare?.configured ? "success" : "warning"} message={data?.cloudflare?.configured ? "Cloudflare provisioning is configured" : "Cloudflare provisioning is not configured"} description={data?.cloudflare?.configured ? `SaaS CNAME target: ${data.cloudflare.cname_target || "—"}. Provisioning still does not change customer DNS.` : "Set the backend Cloudflare environment variables in Render before clicking Provision."} style={{ marginBottom: 12 }} />
      <Form form={form} layout="inline" onFinish={addDomain} initialValues={{ site_kind: "guide" }}>
        <Form.Item name="hostname" rules={[{ required: true, message: "Enter a hostname" }, { pattern: /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i, message: "Use a hostname without https:// or a path" }]}><Input placeholder="support.example.com" style={{ width: 260 }} /></Form.Item>
        <Form.Item name="site_kind"><Select style={{ width: 130 }} options={[{ value: "guide", label: "Guide" }, { value: "chat", label: "Chat" }, { value: "admin", label: "Admin" }]} /></Form.Item>
        <Form.Item><Button type="primary" htmlType="submit" loading={busy}>Add domain</Button></Form.Item>
      </Form>
    </Card>

    <Card title="Mapped domains" style={{ marginTop: 12 }}>
      <Table rowKey="id" loading={loading} dataSource={data?.custom_domains || []} columns={columns} pagination={false} expandable={{ expandedRowRender: (row: any) => <Space direction="vertical" style={{ width: "100%" }}><Typography.Text type="secondary">DNS records to add at the customer DNS provider</Typography.Text><Table size="small" rowKey={(record: any, index) => `${record.type}-${record.name}-${index}`} dataSource={row.dns?.records || []} pagination={false} columns={[{ title: "Type", dataIndex: "type" }, { title: "Name", dataIndex: "name" }, { title: "Value", dataIndex: "value" }, { title: "Purpose", dataIndex: "purpose" }]} /></Space> }} />
      {data?.custom_domains?.length ? null : <Alert showIcon type="info" message="No custom domains yet" description="Add a customer hostname above, then provision it through Cloudflare." style={{ marginTop: 12 }} />}
    </Card>
  </>;
}
