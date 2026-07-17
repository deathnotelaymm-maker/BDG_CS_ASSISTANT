import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from "antd";
import {
  ApiOutlined,
  CloudOutlined,
  CopyOutlined,
  DeleteOutlined,
  GlobalOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/platform-control-center")({
  component: PlatformControlCenter,
});

type Tenant = {
  id: number;
  tenant_key: string;
  name: string;
  contact_email?: string;
  plan_code?: string;
  status?: string;
  default_locale?: string;
  platform_count?: number;
};
type Platform = {
  id: number;
  tenant_id: number;
  tenant_key?: string;
  tenant_name?: string;
  parent_platform_id?: number | null;
  platform_key: string;
  public_route_key?: string;
  access_links?: { route_key: string; chat: string; guide: string; admin: string };
  name: string;
  description?: string;
  support_mode?: string;
  default_locale?: string;
  legacy_support_platform_key?: string;
  status?: string;
};
type PlatformDetail = Platform & {
  domains: Array<{ id: number; site_kind: string; hostname: string; public_url: string; provisioning_status: string; verification_note?: string }>;
  members: Array<{ id: number; name: string; email: string; role: string; is_active: boolean }>;
  features: Array<{ feature_key: string; label: string; enabled: boolean }>;
};
type Brand = Record<string, string>;
type Connector = { enabled: boolean; configured: boolean; allowed_actions: string[]; timeout_ms: number; max_retries: number; secret_configured: boolean; urls: Record<string, boolean> };
type Control = { operator: boolean; tenants: Tenant[]; platforms: Platform[]; platform_feature_catalog: Array<{ feature_key: string; label: string }>; domain_note?: string };

const statusColor = (value?: string) => value === "active" || value === "verified" ? "green" : value === "pending_dns" ? "gold" : "default";

function PlatformControlCenter() {
  const [control, setControl] = useState<Control | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlatformDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [connector, setConnector] = useState<Connector | null>(null);
  const [connectorForm] = Form.useForm();
  const [connectorTestForm] = Form.useForm();
  const [tenantForm] = Form.useForm();
  const [platformForm] = Form.useForm();
  const [domainForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [brandForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.getTenantControlCenter();
      setControl(result as Control);
    } catch (error: any) {
      message.error(error?.message || "Could not load the Platform Control Center");
    } finally {
      setLoading(false);
    }
  };
  const openPlatform = async (row: Platform) => {
    setDetailLoading(true);
    try { const detail = await api.getTenantPlatform(row.id) as PlatformDetail; setSelected(detail); const [result, connectorResult] = await Promise.all([api.getPlatformBrand(row.id) as Promise<any>, api.getPlatformConnector(row.id) as Promise<any>]); setBrand(result.brand || {}); brandForm.setFieldsValue(result.brand || {}); setConnector(connectorResult as Connector); connectorForm.setFieldsValue({ ...(connectorResult || {}), allowed_actions: connectorResult?.allowed_actions || [] }); }
    catch (error: any) { message.error(error?.message || "Could not load platform details"); }
    finally { setDetailLoading(false); }
  };
  const refreshSelected = async () => {
    if (!selected) return;
    await openPlatform(selected);
    await load();
  };
  useEffect(() => { load(); }, []);

  const tenantById = useMemo(() => new Map((control?.tenants || []).map((tenant) => [tenant.id, tenant])), [control]);
  const platformColumns: ColumnsType<Platform> = [
    { title: "Platform", dataIndex: "name", render: (name, row) => <Space direction="vertical" size={0}><Button type="link" style={{ padding: 0, height: "auto" }} onClick={() => openPlatform(row)}>{name}</Button><span className="muted">{row.platform_key}</span></Space> },
    { title: "Client company", dataIndex: "tenant_name", render: (_, row) => tenantById.get(row.tenant_id)?.name || row.tenant_name || "—" },
    { title: "Parent", render: (_, row) => row.parent_platform_id ? control?.platforms.find((platform) => platform.id === row.parent_platform_id)?.name || `#${row.parent_platform_id}` : <Tag>Root platform</Tag> },
    { title: "Support", dataIndex: "support_mode", render: (value) => <Tag color="blue">{value || "none"}</Tag> },
    { title: "Status", dataIndex: "status", render: (value) => <Tag color={statusColor(value)}>{value || "active"}</Tag> },
    { title: "", width: 100, render: (_, row) => <Button size="small" onClick={() => openPlatform(row)}>Manage</Button> },
  ];
  const tenantColumns: ColumnsType<Tenant> = [
    { title: "Client company", dataIndex: "name", render: (name, row) => <Space direction="vertical" size={0}><b>{name}</b><span className="muted">{row.tenant_key}</span></Space> },
    { title: "Plan", dataIndex: "plan_code", render: (value) => <Tag color="purple">{value || "starter"}</Tag> },
    { title: "Platform count", dataIndex: "platform_count" },
    { title: "Contact", dataIndex: "contact_email", render: (value) => value || "—" },
    { title: "Status", dataIndex: "status", render: (value) => <Tag color={statusColor(value)}>{value || "active"}</Tag> },
    { title: "", width: 160, render: (_, tenant) => <Space>
      <Tooltip title={Number(tenant.platform_count || 0) >= 1 ? "One active platform is allowed per client company" : "Create the platform for this client company"}><Button size="small" disabled={Number(tenant.platform_count || 0) >= 1} icon={<PlusOutlined />} onClick={() => { platformForm.resetFields(); platformForm.setFieldsValue({ tenant_id: tenant.id, default_locale: tenant.default_locale || "en", support_mode: "none", status: "active" }); setPlatformOpen(true); }}>Platform</Button></Tooltip>
      {control?.operator && tenant.tenant_key !== "bdg-operations" && <Popconfirm title="Archive this client company and its platforms?" description="Its data is retained but no longer active." onConfirm={() => api.archiveTenant(tenant.id).then(() => { message.success("Client company archived"); load(); })}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>}
    </Space> },
  ];

  const createTenant = async () => {
    const values = await tenantForm.validateFields();
    await api.createTenant(values);
    message.success("Client company created. Add its first platform next.");
    setTenantOpen(false); tenantForm.resetFields(); load();
  };
  const createPlatform = async () => {
    const values = await platformForm.validateFields();
    const tenantId = values.tenant_id;
    delete values.tenant_id;
    const created = await api.createTenantPlatform(tenantId, values) as PlatformDetail;
    message.success("Platform created. Its Chat, Guide, and Admin links are ready.");
    setPlatformOpen(false); platformForm.resetFields(); setSelected(created); load();
  };
  const createDomain = async () => {
    if (!selected) return;
    const values = await domainForm.validateFields();
    await api.createPlatformDomain(selected.id, values);
    message.success("Optional custom-domain plan saved. Cloudflare will verify it later.");
    setDomainOpen(false); domainForm.resetFields(); refreshSelected();
  };
  const createMember = async () => {
    if (!selected) return;
    const values = await memberForm.validateFields();
    await api.createPlatformMember(selected.id, values);
    message.success("Platform member saved.");
    setMemberOpen(false); memberForm.resetFields(); refreshSelected();
  };
  const saveConnector = async () => {
    if (!selected) return;
    try { const values = await connectorForm.validateFields(); const result = await api.updatePlatformConnector(selected.id, values) as Connector; setConnector(result); connectorForm.setFieldsValue({ ...result, allowed_actions: result.allowed_actions || [] }); message.success("Operations connector settings saved"); } catch (error: any) { message.error(error?.message || "Connector settings could not be saved"); }
  };
  const testConnector = async () => {
    if (!selected) return;
    try { const values = await connectorTestForm.validateFields(); const result = await api.testPlatformConnector(selected.id, values) as any; if (result.ok) message.success(`Connector test passed (${result.http_status || "ok"})`); else message.warning(result.message || result.question || "Connector test did not pass"); } catch (error: any) { message.error(error?.message || "Connector test failed"); }
  };

  return <Spin spinning={loading}>
    <div className="bdg-filters" style={{ alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0 }}>Platform Control Center</h2>
        <div style={{ color: "#8ea0bd", marginTop: 6 }}>Create a client company, then generate its Chat, Guide, and Admin links automatically. Custom domains are optional later.</div>
      </div>
      <Space>
        <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
        {control?.operator && <Button type="primary" icon={<PlusOutlined />} onClick={() => { tenantForm.resetFields(); tenantForm.setFieldsValue({ plan_code: "starter", default_locale: "en", status: "active" }); setTenantOpen(true); }}>New client company</Button>}
      </Space>
    </div>

    <Alert type="info" showIcon icon={<CloudOutlined />} message="Generated platform access links" description={control?.domain_note || "Each platform receives Chat, Guide, and Admin routes immediately. A custom domain is optional and must be verified by Cloudflare."} style={{ marginBottom: 16 }} />
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} md={8}><Card><Statistic title="Client companies" value={control?.tenants.length || 0} prefix={<TeamOutlined />} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Child platforms" value={control?.platforms.length || 0} prefix={<ApiOutlined />} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Included modules" value={control?.platform_feature_catalog.length || 0} prefix={<GlobalOutlined />} /></Card></Col>
    </Row>
    <Card title="Client companies" extra={<Tooltip title="Each client company is limited to one active platform."><GlobalOutlined /></Tooltip>} style={{ marginBottom: 16 }}>
      <Table rowKey="id" size="middle" columns={tenantColumns} dataSource={control?.tenants || []} pagination={{ pageSize: 10 }} locale={{ emptyText: "No client company is available to your account." }} />
    </Card>
    <Card title="Child platforms" extra={<Button icon={<PlusOutlined />} disabled={(control?.tenants || []).every((tenant) => Number(tenant.platform_count || 0) >= 1)} onClick={() => { platformForm.resetFields(); platformForm.setFieldsValue({ default_locale: "en", support_mode: "none", status: "active" }); setPlatformOpen(true); }}>New platform</Button>}>
      <Table rowKey="id" size="middle" columns={platformColumns} dataSource={control?.platforms || []} pagination={{ pageSize: 20 }} locale={{ emptyText: "Create a platform under a client company to begin." }} />
    </Card>

    <Drawer title="Create client company" width={560} open={tenantOpen} onClose={() => setTenantOpen(false)} extra={<Space><Button onClick={() => setTenantOpen(false)}>Cancel</Button><Button type="primary" onClick={createTenant}>Create</Button></Space>}>
      <Form form={tenantForm} layout="vertical">
        <Form.Item name="name" label="Client company name" rules={[{ required: true }]}><Input placeholder="Example: Acme Entertainment" /></Form.Item>
        <Form.Item name="tenant_key" label="Stable tenant key" rules={[{ required: true, pattern: /^[a-z0-9_-]+$/, message: "Use lowercase letters, numbers, - or _ only" }]}><Input placeholder="acme-entertainment" /></Form.Item>
        <Form.Item name="contact_email" label="Billing / owner email" rules={[{ type: "email" }]}><Input placeholder="owner@client.com" /></Form.Item>
        <Form.Item name="plan_code" label="Plan"><Select options={["starter", "business", "enterprise"].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item name="default_locale" label="Default language"><Select options={[{ value: "en", label: "English" }, { value: "hi", label: "Hindi / Indian" }, { value: "all", label: "Multi-language" }]} /></Form.Item>
        <Form.Item name="notes" label="Operator notes"><Input.TextArea rows={4} placeholder="Private operating notes for this client company" /></Form.Item>
      </Form>
    </Drawer>

    <Drawer title="Create child platform" width={620} open={platformOpen} onClose={() => setPlatformOpen(false)} extra={<Space><Button onClick={() => setPlatformOpen(false)}>Cancel</Button><Button type="primary" onClick={createPlatform}>Create platform</Button></Space>}>
      <Alert type="warning" showIcon message="Create the child-platform owner in Admin Users first" description="Enter that existing admin email below. The server assigns it as the child platform owner when this platform is created." style={{ marginBottom: 16 }} />
      <Form form={platformForm} layout="vertical">
        <Form.Item name="tenant_id" label="Client company" rules={[{ required: true }]}><Select options={(control?.tenants || []).filter((tenant) => tenant.status === "active").map((tenant) => ({ value: tenant.id, label: `${tenant.name} (${tenant.tenant_key})` }))} /></Form.Item>
        <Form.Item name="name" label="Platform name" rules={[{ required: true }]}><Input placeholder="Example: Acme India Support" /></Form.Item>
        <Alert type="info" showIcon message="Access links are generated automatically" description="The platform key and a secure route ID are created from this platform name. You will copy the Chat, Guide, and Admin links after saving." style={{ marginBottom: 12 }} />
        <Form.Item name="parent_platform_id" label="Parent platform (optional)"><Select allowClear options={(control?.platforms || []).map((platform) => ({ value: platform.id, label: `${platform.tenant_name || ""} · ${platform.name}` }))} /></Form.Item>
        <Form.Item name="owner_email" label="Child-platform owner email" rules={[{ required: true, type: "email" }]}><Input placeholder="client-owner@example.com" /></Form.Item>
        <Form.Item name="support_mode" label="Support process"><Select options={[{ value: "none", label: "No ticket system" }, { value: "tickets", label: "Ticket system" }, { value: "hybrid", label: "Hybrid support" }]} /></Form.Item>
        <Form.Item name="default_locale" label="Default language"><Select options={[{ value: "en", label: "English" }, { value: "hi", label: "Hindi / Indian" }, { value: "all", label: "Multi-language" }]} /></Form.Item>
        <Form.Item name="description" label="Internal description"><Input.TextArea rows={3} placeholder="Brand, audience, or operation notes" /></Form.Item>
      </Form>
    </Drawer>

    <Drawer title={selected ? `Manage · ${selected.name}` : "Platform"} width={760} open={!!selected || detailLoading} onClose={() => setSelected(null)} extra={<Button icon={<ReloadOutlined />} onClick={refreshSelected}>Refresh</Button>}>
      {detailLoading && !selected ? <Spin /> : selected && <>
        <Descriptions bordered size="small" column={1} items={[
          { key: "tenant", label: "Client company", children: `${selected.tenant_name} · ${selected.tenant_key}` },
          { key: "key", label: "Platform key", children: selected.platform_key },
          { key: "access", label: "Generated route ID", children: selected.public_route_key || "Generating…" },
          { key: "route", label: "Existing support route", children: selected.legacy_support_platform_key || "Assigned when published" },
          { key: "mode", label: "Support process", children: <Tag color="blue">{selected.support_mode}</Tag> },
          { key: "state", label: "State", children: <Tag color={statusColor(selected.status)}>{selected.status}</Tag> },
        ]} />
        <Divider />
        <Tabs items={[
          { key: "access-links", label: "Platform access links", children: <>
            <Alert type="success" showIcon message="Ready to share immediately" description="These generated URLs use your existing BDG Pages sites. They are not custom DNS domains." style={{ marginBottom: 16 }} />
            {([['AI Chat', selected.access_links?.chat], ['Guide / tutorial', selected.access_links?.guide], ['Admin backend', selected.access_links?.admin]] as const).map(([label, url]) => <Form.Item key={label} label={label}><Space.Compact style={{ width: '100%' }}><Input readOnly value={url || 'Generating platform access link…'} /><Button icon={<CopyOutlined />} disabled={!url} onClick={async () => { try { await navigator.clipboard.writeText(url || ''); message.success(`${label} link copied`); } catch { message.error('Could not copy the link'); } }}>Copy</Button><Button disabled={!url} href={url || undefined} target="_blank">Open</Button></Space.Compact></Form.Item>)}
          </> },
          { key: "domains", label: `Optional custom domains (${selected.domains.length})`, children: <>
            <Space style={{ marginBottom: 12 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => { domainForm.resetFields(); domainForm.setFieldsValue({ provisioning_status: "planned", site_kind: "chat" }); setDomainOpen(true); }}>Add domain</Button></Space>
            <Table rowKey="id" size="small" pagination={false} dataSource={selected.domains} columns={[
              { title: "Type", dataIndex: "site_kind", render: (value) => <Tag color="blue">{value}</Tag> },
              { title: "Hostname", dataIndex: "hostname", render: (value, row) => row.provisioning_status === 'verified' ? <a href={row.public_url} target="_blank" rel="noreferrer">{value}</a> : value },
              { title: "DNS / status", dataIndex: "provisioning_status", render: (value) => <Tag color={statusColor(value)}>{value}</Tag> },
              { title: "", width: 48, render: (_, row) => <Popconfirm title="Remove this domain plan?" onConfirm={() => api.deletePlatformDomain(row.id).then(() => { message.success("Domain removed"); refreshSelected(); })}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> },
            ]} />
          </> },
          { key: "team", label: `Team (${selected.members.length})`, children: <>
            <Space style={{ marginBottom: 12 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => { memberForm.resetFields(); memberForm.setFieldsValue({ role: "content_manager" }); setMemberOpen(true); }}>Add platform member</Button></Space>
            <Table rowKey="id" size="small" pagination={false} dataSource={selected.members} columns={[
              { title: "Member", render: (_, row) => <Space direction="vertical" size={0}><span>{row.name}</span><span className="muted">{row.email}</span></Space> },
              { title: "Role", dataIndex: "role", render: (value) => <Tag color={value === "platform_owner" ? "gold" : "blue"}>{value}</Tag> },
              { title: "Status", dataIndex: "is_active", render: (value) => <Tag color={value ? "green" : "default"}>{value ? "active" : "inactive"}</Tag> },
              { title: "", width: 48, render: (_, row) => row.role === "platform_owner" ? null : <Popconfirm title="Remove this member from the platform?" onConfirm={() => api.removePlatformMember(row.id).then(() => { message.success("Platform member removed"); refreshSelected(); })}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> },
            ]} />
          </> },
          { key: "brand", label: "Brand Studio", children: <Form form={brandForm} layout="vertical" onFinish={async (values) => { try { const result = await api.updatePlatformBrand(selected.id, values) as any; setBrand(result.brand || values); brandForm.setFieldsValue(result.brand || values); message.success("Platform branding saved"); } catch (error: any) { message.error(error?.message || "Brand update failed"); } }}><Alert type="info" showIcon message="Platform-owned branding" description="These values are used by the Guide, Chat, and Admin surfaces for this platform. Empty fields inherit the platform defaults." style={{ marginBottom: 16 }} /><Row gutter={12}><Col span={12}><Form.Item name="brand_name" label="Brand name"><Input /></Form.Item></Col><Col span={12}><Form.Item name="brand_tagline" label="Tagline"><Input /></Form.Item></Col><Col span={12}><Form.Item name="admin_logo_url" label="Admin logo URL"><Input placeholder="https://.../logo.png" /></Form.Item></Col><Col span={12}><Form.Item name="admin_favicon_url" label="Admin favicon URL"><Input placeholder="https://.../favicon.png" /></Form.Item></Col><Col span={12}><Form.Item name="guide_logo_url" label="Guide logo URL"><Input placeholder="https://.../logo.png" /></Form.Item></Col><Col span={12}><Form.Item name="guide_favicon_url" label="Guide favicon URL"><Input placeholder="https://.../favicon.png" /></Form.Item></Col><Col span={12}><Form.Item name="chat_icon_url" label="Chat icon URL"><Input placeholder="https://.../icon.png" /></Form.Item></Col><Col span={12}><Form.Item name="chat_favicon_url" label="Chat favicon URL"><Input placeholder="https://.../favicon.png" /></Form.Item></Col><Col span={8}><Form.Item name="accent_color" label="Accent color"><Input placeholder="#3b82f6" /></Form.Item></Col><Col span={8}><Form.Item name="surface_color" label="Surface color"><Input placeholder="#0f172a" /></Form.Item></Col><Col span={8}><Form.Item name="button_style" label="Button style"><Select options={[{value:"rounded",label:"Rounded"},{value:"pill",label:"Pill"},{value:"square",label:"Square"}]} /></Form.Item></Col></Row><Button type="primary" htmlType="submit">Save brand settings</Button></Form> },
          { key: "connector", label: "Operations Connector", children: <>
            <Alert type="info" showIcon message="Backend-only platform checks" description="Connectors are optional. Secrets stay encrypted on the backend, only allowlisted actions can run, and every test is audited with a redacted request ID." style={{ marginBottom: 16 }} />
            <Form form={connectorForm} layout="vertical">
              <Form.Item name="enabled" label="Enable live platform checks" valuePropName="checked"><Switch /></Form.Item>
              <Form.Item name="allowed_actions" label="Allowed actions"><Select mode="multiple" options={["game_status", "game_catalog", "payment_order_status"].map((value) => ({ value, label: value.replace(/_/g, " ") }))} /></Form.Item>
              <Row gutter={12}><Col span={24}><Form.Item name="game_status_url" label="Game status endpoint"><Input placeholder="https://client-api.example.com/game-status" /></Form.Item></Col><Col span={24}><Form.Item name="game_catalog_url" label="Game catalog endpoint"><Input placeholder="https://client-api.example.com/game-catalog" /></Form.Item></Col><Col span={24}><Form.Item name="payment_order_status_url" label="Payment order status endpoint"><Input placeholder="https://client-api.example.com/payment-order-status" /></Form.Item></Col><Col span={12}><Form.Item name="timeout_ms" label="Timeout (ms)"><Input type="number" min={1500} max={10000} /></Form.Item></Col><Col span={12}><Form.Item name="max_retries" label="Retries"><Input type="number" min={0} max={2} /></Form.Item></Col></Row>
              <Form.Item name="secret_token" label="Backend API secret"><Input.Password placeholder={connector?.secret_configured ? "Configured — leave blank to keep it" : "Write-only secret"} /></Form.Item>
              <Button type="primary" onClick={saveConnector}>Save connector</Button>
            </Form>
            <Divider />
            <Form form={connectorTestForm} layout="inline" initialValues={{ action: "game_status" }}><Form.Item name="action"><Select style={{ width: 190 }} options={["game_status", "game_catalog", "payment_order_status"].map((value) => ({ value, label: value.replace(/_/g, " ") }))} /></Form.Item><Form.Item name="game_name"><Input placeholder="Game name (for game checks)" /></Form.Item><Form.Item name="order_number"><Input placeholder="Order number (for payment)" /></Form.Item><Button onClick={testConnector}>Test connection</Button></Form>
          </> },
          { key: "features", label: `Features (${selected.features.length})`, children: <Table rowKey="feature_key" size="small" pagination={false} dataSource={selected.features} columns={[
            { title: "Module", dataIndex: "label" },
            { title: "Key", dataIndex: "feature_key", render: (value) => <code>{value}</code> },
            { title: "Enabled", dataIndex: "enabled", width: 140, render: (enabled, row) => <Switch checked={enabled} onChange={async (checked) => { try { await api.updatePlatformFeature(selected.id, row.feature_key, { enabled: checked }); message.success(`${row.label} ${checked ? "enabled" : "disabled"}`); refreshSelected(); } catch (error: any) { message.error(error?.message || "Feature update failed"); } }} /> },
          ]} /> },
        ]} />
        {control?.operator && selected.legacy_support_platform_key !== "default" && <Popconfirm title="Archive this child platform?" description="Content is kept for recovery, but new activity stops." onConfirm={() => api.archiveTenantPlatform(selected.id).then(() => { message.success("Platform archived"); setSelected(null); load(); })}><Button danger icon={<DeleteOutlined />}>Archive platform</Button></Popconfirm>}
      </>}
    </Drawer>

    <Drawer title={`Optional custom domain · ${selected?.name || "platform"}`} width={520} open={domainOpen} onClose={() => setDomainOpen(false)} extra={<Space><Button onClick={() => setDomainOpen(false)}>Cancel</Button><Button type="primary" onClick={createDomain}>Save domain plan</Button></Space>}>
      <Alert type="info" showIcon message="Use generated links until your branded domain is ready" description="This only stores the domain plan. Configure the hostname and DNS in Cloudflare. The platform cannot mark a domain Verified by itself." style={{ marginBottom: 16 }} />
      <Form form={domainForm} layout="vertical">
        <Form.Item name="site_kind" label="Website" rules={[{ required: true }]}><Select options={[{ value: "chat", label: "AI Chat" }, { value: "guide", label: "Guide / Tutorial" }, { value: "admin", label: "Admin Backend" }]} /></Form.Item>
        <Form.Item name="hostname" label="Hostname" rules={[{ required: true }]}><Input prefix={<LinkOutlined />} placeholder="chat-client.javo.com" /></Form.Item>
        <Form.Item name="provisioning_status" label="Status"><Select options={[{ value: "planned", label: "Planned" }, { value: "pending_dns", label: "DNS pending" }, { value: "disabled", label: "Disabled" }]} /></Form.Item>
        <Form.Item name="verification_note" label="DNS / verification note"><Input.TextArea rows={4} placeholder="Example: CNAME added; wait for Cloudflare custom hostname verification." /></Form.Item>
      </Form>
    </Drawer>

    <Drawer title={`Add platform member · ${selected?.name || "platform"}`} width={520} open={memberOpen} onClose={() => setMemberOpen(false)} extra={<Space><Button onClick={() => setMemberOpen(false)}>Cancel</Button><Button type="primary" onClick={createMember}>Save member</Button></Space>}>
      <Alert type="info" showIcon message="Existing Admin User or new child-platform admin" description="For a new email, set a temporary password. The owner must change it after first login." style={{ marginBottom: 16 }} />
      <Form form={memberForm} layout="vertical">
        <Form.Item name="name" label="Name"><Input placeholder="Optional when account already exists" /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}><Input /></Form.Item>
        <Form.Item name="temporary_password" label="Temporary password for a new admin" rules={[{ min: 12, message: "Use at least 12 characters" }]}><Input.Password placeholder="Leave empty only for an existing admin" /></Form.Item>
        <Form.Item name="role" label="Platform role" rules={[{ required: true }]}><Select options={["platform_owner", "platform_admin", "content_manager", "ai_manager", "support_analyst", "viewer"].map((value) => ({ value, label: value.replace(/_/g, " ") }))} /></Form.Item>
      </Form>
    </Drawer>
  </Spin>;
}
