import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Alert, Button, Drawer, Form, Image, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Upload, message } from "antd";
import { DeleteOutlined, EditOutlined, LinkOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/action-buttons")({ component: ActionButtonsPage });

function ActionButtonsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [buttons, platformRows] = await Promise.all([api.list("action-buttons"), api.listSupportPlatforms()]);
      setRows(buttons as any[]);
      setPlatforms(platformRows as any[]);
    }
    catch (error: any) { message.error(error?.message || "Failed to load buttons"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const open = (row?: any) => {
    const value = row || { button_key: "", label: "", action_type: "url", target: "same_window", status: "active", sort_order: 100, platform_scope: "all", capability: "general" };
    setEditing(value);
    form.setFieldsValue({ ...value, platform_scope: Array.isArray(value.platform_scope) ? value.platform_scope : String(value.platform_scope || "all").split(/[\s,|\n]+/).filter(Boolean) });
  };
  const save = async () => {
    const values = await form.validateFields();
    try {
      if (editing?.id) await api.update("action-buttons", editing.id, values);
      else await api.create("action-buttons", values);
      message.success(editing?.id ? "Button updated" : "Button created");
      setEditing(null);
      await load();
    } catch (error: any) { message.error(error?.message || "Save failed"); }
  };
  const upload = async (file: File) => {
    try {
      const result = await api.upload(file);
      form.setFieldValue("icon_url", result.url);
      message.success("Icon uploaded");
    } catch (error: any) { message.error(error?.message || "Upload failed"); }
    return false;
  };
  const remove = async (id: number) => {
    try { await api.remove("action-buttons", id); message.success("Button deleted"); await load(); }
    catch (error: any) { message.error(error?.message || "Delete failed"); }
  };

  return <>
    <div className="bdg-filters" style={{ marginBottom: 12 }}>
      <div style={{ flex: 1 }}><h2 style={{ margin: 0 }}>Buttons Configuration</h2><div style={{ color: "#8ea0bd", fontSize: 12 }}>Reusable, approved actions for Chat, AI knowledge, and Guides.</div></div>
      <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => open()}>New button</Button>
    </div>
    <Table rowKey="id" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }} columns={[
      { title: "Button", render: (_: any, row: any) => <Space>{row.icon_url ? <Image preview={false} src={row.icon_url} width={32} height={32} style={{ objectFit:"contain",borderRadius:8 }} /> : <LinkOutlined />}<div><b>{row.label}</b><div style={{ color:"#8ea0bd",fontSize:12 }}>{row.button_key}</div></div></Space> },
      { title: "Hindi", dataIndex: "label_hi" },
      { title: "Action", render: (_: any, row: any) => <div><Tag color="blue">{row.action_type}</Tag><div style={{ maxWidth:420,overflow:"hidden",textOverflow:"ellipsis" }}>{row.url}</div></div> },
      { title: "Platform", render: (_: any, row: any) => <Space direction="vertical" size={0}><Tag color="purple">{row.platform_scope || "all"}</Tag><Tag color={row.capability === "ticket" ? "gold" : "blue"}>{row.capability || "general"}</Tag></Space> },
      { title: "Status", dataIndex: "status", width:100, render:(value:string)=><Tag color={value === "active" ? "green" : "default"}>{value}</Tag> },
      { title: "Actions", width:140, render:(_:any,row:any)=><Space><Button size="small" icon={<EditOutlined />} onClick={()=>open(row)}>Edit</Button><Popconfirm title="Delete this reusable button?" onConfirm={()=>remove(row.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
    ]} />
    <Drawer open={!!editing} onClose={()=>setEditing(null)} width={720} title={editing?.id ? "Edit button" : "Create button"} extra={<Space><Button onClick={()=>setEditing(null)}>Cancel</Button><Button type="primary" onClick={save}>Save</Button></Space>}>
      <Form form={form} layout="vertical">
        <Alert showIcon type="info" style={{ marginBottom:16 }} message="Capability guard" description="Ticket buttons are visible to AI only on platforms configured as Tickets or Hybrid. A normal support button can still be used on platforms without tickets." />
        <Space.Compact style={{ width:"100%" }}>
          <Form.Item name="button_key" label="Unique key" rules={[{required:true}]} style={{ width:"50%" }}><Input placeholder="deposit-inquiry" /></Form.Item>
          <Form.Item name="status" label="Status" style={{ width:"50%" }}><Select options={[{value:"active",label:"Active"},{value:"inactive",label:"Inactive"}]} /></Form.Item>
        </Space.Compact>
        <Space.Compact style={{ width:"100%" }}>
          <Form.Item name="platform_scope" label="Available on platforms" style={{ width:"50%" }}><Select mode="multiple" options={[{ value:"all",label:"All active platforms" }, ...platforms.filter((platform) => platform.status === "active").map((platform) => ({ value:platform.platform_key,label:`${platform.name} (${platform.support_mode})` }))]} /></Form.Item>
          <Form.Item name="capability" label="Capability" style={{ width:"50%" }}><Select options={[{ value:"general",label:"General action" },{ value:"ticket",label:"Ticket action (guarded)" },{ value:"support",label:"Support/contact action" }]} /></Form.Item>
        </Space.Compact>
        <Form.Item name="ticket_type" label="Ticket type / label"><Input placeholder="Deposit inquiry, bank-card change, KYC review…" /></Form.Item>
        <Space.Compact style={{ width:"100%" }}>
          <Form.Item name="label" label="English label" rules={[{required:true}]} style={{ width:"50%" }}><Input /></Form.Item>
          <Form.Item name="label_hi" label="Hindi / Indian label" style={{ width:"50%" }}><Input /></Form.Item>
        </Space.Compact>
        <Space.Compact style={{ width:"100%" }}>
          <Form.Item name="subtitle" label="English subtitle" style={{ width:"50%" }}><Input /></Form.Item>
          <Form.Item name="subtitle_hi" label="Hindi / Indian subtitle" style={{ width:"50%" }}><Input /></Form.Item>
        </Space.Compact>
        <Form.Item name="icon_url" label="Button icon"><Input addonAfter={<Upload showUploadList={false} accept="image/png,image/jpeg,image/webp,image/svg+xml" beforeUpload={upload}><Button size="small" icon={<UploadOutlined />}>Upload</Button></Upload>} /></Form.Item>
        <Space.Compact style={{ width:"100%" }}>
          <Form.Item name="action_type" label="Action type" style={{ width:"50%" }}><Select options={[{value:"url",label:"Website URL"},{value:"deep_link",label:"App deep link"},{value:"internal",label:"Guide/Chat internal page"},{value:"chat_prompt",label:"Send a Chat prompt"}]} /></Form.Item>
          <Form.Item name="target" label="Open in" style={{ width:"50%" }}><Select options={[{value:"same_window",label:"Same window"},{value:"new_window",label:"New window"}]} /></Form.Item>
        </Space.Compact>
        <Form.Item name="url" label="URL, deep link, internal path, or prompt:text" rules={[{required:true}]}><Input placeholder="https://…  |  bdg://…  |  /guides/…  |  prompt:Deposit not received" /></Form.Item>
        <Form.Item name="fallback_url" label="Browser fallback URL"><Input placeholder="https://…" /></Form.Item>
        <Form.Item name="allowed_hosts" label="Allowed web hosts"><Input placeholder="bdg.example.com, support.example.com" /></Form.Item>
        <Form.Item name="sort_order" label="Sort order"><InputNumber min={1} max={9999} style={{ width:"100%" }} /></Form.Item>
      </Form>
    </Drawer>
  </>;
}
