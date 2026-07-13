import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Form, Image, Input, InputNumber, message, Modal, Popconfirm, Space, Table, Upload } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [iconUrl, setIconUrl] = useState("");
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setRows((await api.list("categories")) as any[]); }
    catch (error: any) { message.error(error?.message || "Failed to load categories"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const open = (item?: any) => {
    const value = item || { name: "", slug: "", description: "", icon: "target", icon_url: "", sort_order: 100 };
    setEditing(value);
    setIconUrl(value.icon_url || "");
    form.setFieldsValue(value);
  };

  const save = async () => {
    const values = await form.validateFields();
    const payload = { ...values, icon_url: iconUrl };
    try {
      if (editing?.id) await api.update("categories", editing.id, payload);
      else await api.create("categories", payload);
      message.success(editing?.id ? "Category updated" : "Category created");
      setEditing(null);
      await load();
    } catch (error: any) { message.error(error?.message || "Save failed"); }
  };

  const uploadIcon = async (file: File) => {
    try {
      const uploaded = await api.upload(file);
      setIconUrl(uploaded.url);
      message.success("Category icon uploaded");
    } catch (error: any) { message.error(error?.message || "Icon upload failed"); }
    return false;
  };

  const remove = async (id: number) => {
    try { await api.remove("categories", id); message.success("Category deleted"); await load(); }
    catch (error: any) { message.error(error?.message || "Delete failed"); }
  };

  return <>
    <div className="bdg-filters" style={{ marginBottom: 12 }}>
      <div style={{ flex: 1, color: "#8ea0bd" }}>Upload a custom topic icon. The Guide Center uses it automatically.</div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => open()}>New category</Button>
    </div>
    <Table
      rowKey="id"
      loading={loading}
      dataSource={rows}
      pagination={{ pageSize: 20 }}
      columns={[
        { title: "Icon", width: 80, render: (_, item: any) => item.icon_url ? <Image src={item.icon_url} width={42} height={42} preview={false} style={{ objectFit: "contain", borderRadius: 8 }} /> : <div style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 8, background: "#13243d" }}>{item.icon || "◎"}</div> },
        { title: "Name", dataIndex: "name" },
        { title: "Slug", dataIndex: "slug" },
        { title: "Description", dataIndex: "description" },
        { title: "Order", dataIndex: "sort_order", width: 90 },
        { title: "Actions", width: 140, render: (_, item: any) => <Space><Button size="small" icon={<EditOutlined />} onClick={() => open(item)}>Edit</Button><Popconfirm title="Delete category?" onConfirm={() => remove(item.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
      ]}
    />
    <Modal open={!!editing} title={editing?.id ? "Edit category" : "New category"} onCancel={() => setEditing(null)} onOk={save} okText="Save">
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="slug" label="Slug" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="icon" label="Fallback built-in icon"><Input placeholder="target" /></Form.Item>
        <Form.Item label="Custom topic icon">
          <Space align="start">
            {iconUrl ? <Image src={iconUrl} width={64} height={64} style={{ objectFit: "contain", borderRadius: 10 }} /> : <div style={{ width: 64, height: 64, border: "1px dashed #53647e", borderRadius: 10 }} />}
            <Space direction="vertical"><Upload showUploadList={false} beforeUpload={uploadIcon} accept="image/png,image/jpeg,image/webp,image/gif"><Button icon={<UploadOutlined />}>Upload icon</Button></Upload>{iconUrl && <Button danger size="small" onClick={() => setIconUrl("")}>Remove icon</Button>}</Space>
          </Space>
        </Form.Item>
        <Form.Item name="sort_order" label="Sort order"><InputNumber min={1} max={999} style={{ width: "100%" }} /></Form.Item>
      </Form>
    </Modal>
  </>;
}
