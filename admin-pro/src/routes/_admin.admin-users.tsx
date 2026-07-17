import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Popconfirm, Select, Space, Table, Tag, message } from "antd";
import { DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { api, getActiveAdminPlatformRoute } from "@/lib/api";

export const Route = createFileRoute("/_admin/admin-users")({ component: AdminUsersPage });

type AdminUser = { id: number | string; name: string; email: string; role: string; status: string; lastLogin?: string; twofa_enabled?: boolean; session_version?: number };

function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setRows((await api.list("admin-users")) as AdminUser[]); }
    catch (e: any) { message.error(e?.message || "Failed to load admins"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: getActiveAdminPlatformRoute() ? "platform_admin" : "admin", status: "active" });
    setOpen(true);
  };
  const edit = (row: AdminUser) => {
    setEditing(row);
    form.setFieldsValue(row);
    setOpen(true);
  };
  const save = async () => {
    const values = await form.validateFields();
    if (editing) await api.update("admin-users", editing.id, values);
    else await api.create("admin-users", values);
    message.success(editing ? "Admin updated" : "Admin created");
    setOpen(false);
    load();
  };
  const changePassword = async () => {
    const values = await passwordForm.validateFields();
    if (values.password !== values.confirm_password) return message.error("Passwords do not match");
    await api.changeAdminPassword(passwordUser!.id, values.password);
    message.success("Password changed");
    setPasswordOpen(false);
  };

  const columns: ColumnsType<AdminUser> = [
    { title: "Name", dataIndex: "name" },
    { title: "Email", dataIndex: "email" },
    { title: "Role", dataIndex: "role", width: 120, render: (v) => <Tag color={v === "owner" ? "gold" : "blue"}>{v}</Tag> },
    { title: "Status", dataIndex: "status", width: 120, render: (v) => <Tag color={v === "active" ? "green" : "default"}>{v}</Tag> },
    { title: "2FA", dataIndex: "twofa_enabled", width: 100, render: (v) => <Tag color={v ? "green" : "orange"}>{v ? "ON" : "OFF"}</Tag> },
    { title: "Session", dataIndex: "session_version", width: 90 },
    { title: "Last login", dataIndex: "lastLogin", width: 190 },
    { title: "Actions", width: 430, render: (_, row) => <Space>
      <Button size="small" icon={<EditOutlined />} onClick={() => edit(row)}>Edit</Button>
      <Button size="small" icon={<KeyOutlined />} onClick={() => { setPasswordUser(row); passwordForm.resetFields(); setPasswordOpen(true); }}>Password</Button>
      <Button size="small" onClick={() => api.forceLogoutAdmin(row.id).then(() => { message.success("Admin logged out"); load(); })}>Force logout</Button>
      <Button size="small" onClick={() => api.resetAdmin2FA(row.id).then(() => { message.success("2FA reset"); load(); })}>Reset 2FA</Button>
      {row.role !== "owner" && <Popconfirm title="Delete this admin?" onConfirm={() => api.remove("admin-users", row.id).then(load)} okButtonProps={{ danger: true }}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>}
    </Space> },
  ];

  return <>
    <div className="bdg-filters">
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0 }}>Admin Users</h2>
        <div style={{ color: "#8ea0bd", fontSize: 12 }}>Owner can change email, create admins, disable users, and reset passwords.</div>
      </div>
      <Space>
        <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>Create admin</Button>
      </Space>
    </div>
    <Table className="bdg-table" rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 20 }} />

    <Drawer title={editing ? "Edit admin" : "Create admin"} width={520} open={open} onClose={() => setOpen(false)} extra={<Space><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="primary" onClick={save}>Save</Button></Space>}>
      <Form layout="vertical" form={form}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}><Input /></Form.Item>
        {!editing && <Form.Item name="password" label="Temporary password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>}
        <Form.Item name="role" label="Role"><Select options={getActiveAdminPlatformRoute() ? ["platform_admin", "content_manager", "ai_manager", "support_analyst", "viewer"].map((value) => ({ value, label: value.replace(/_/g, " ") })) : [{ value: "admin", label: "Admin" }, { value: "owner", label: "Owner (protected, only first owner remains owner)" }]} /></Form.Item>
        <Form.Item name="status" label="Status"><Select options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} /></Form.Item>
      </Form>
    </Drawer>

    <Drawer title={`Change password${passwordUser ? ` · ${passwordUser.email}` : ""}`} width={420} open={passwordOpen} onClose={() => setPasswordOpen(false)} extra={<Space><Button onClick={() => setPasswordOpen(false)}>Cancel</Button><Button type="primary" onClick={changePassword}>Update password</Button></Space>}>
      <Form layout="vertical" form={passwordForm}>
        <Form.Item name="password" label="New password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>
        <Form.Item name="confirm_password" label="Confirm password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>
      </Form>
    </Drawer>
  </>;
}
