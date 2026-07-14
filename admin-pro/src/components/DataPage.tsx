import { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Drawer,
  Form,
  Popconfirm,
  Empty,
  Skeleton,
  Alert,
  message,
} from "antd";
import {
  ReloadOutlined,
  ExportOutlined,
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { api } from "@/lib/api";

export type DataPageProps<T extends { id: number | string; status?: string }> = {
  resource: string;
  columns: ColumnsType<T>;
  editableFields?: { name: string; label: string; type?: "text" | "textarea" | "select" | "number"; options?: string[]; required?: boolean; rows?: number; help?: string }[];
  createLabel?: string;
  statusFilterKey?: string;
  enableDuplicateCleanup?: boolean;
  enableDeleteAll?: boolean;
};

export function StatusTag({ value }: { value?: string }) {
  const v = (value || "").toLowerCase();
  const color =
    v === "active" || v === "operational" || v === "published" || v === "indexed"
      ? "success"
      : v === "inactive" || v === "draft"
      ? "default"
      : v === "pending"
      ? "warning"
      : v === "error"
      ? "error"
      : "processing";
  return <Tag color={color as any} style={{ textTransform: "capitalize", margin: 0 }}>{value}</Tag>;
}

export default function DataPage<T extends { id: number | string; status?: string }>({
  resource,
  columns,
  editableFields = [],
  createLabel = "Create",
  enableDuplicateCleanup = false,
  enableDeleteAll = false,
}: DataPageProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pageSize, setPageSize] = useState(20);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await api.list(resource)) as T[];
      setRows(data);
      setSelectedRowKeys([]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const filtered = useMemo(() => rows.filter((r) => {
    const s = search.trim().toLowerCase();
    const matchSearch = !s || JSON.stringify(r).toLowerCase().includes(s);
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  }), [rows, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };
  const openEdit = (row: T) => {
    setEditing(row);
    form.setFieldsValue(row);
    setDrawerOpen(true);
  };
  const remove = async (row: T) => {
    await api.remove(resource, row.id);
    setRows((r) => r.filter((x) => x.id !== row.id));
    setSelectedRowKeys((keys) => keys.filter((k) => k !== row.id));
    message.success("Deleted");
  };
  const bulkDelete = async () => {
    if (!selectedRowKeys.length) return message.warning("Select records first");
    await api.bulkRemove(resource, selectedRowKeys as any[]);
    setRows((r) => r.filter((x) => !selectedRowKeys.includes(x.id)));
    message.success(`Deleted ${selectedRowKeys.length} selected record(s)`);
    setSelectedRowKeys([]);
  };
  const cleanupDuplicates = async () => {
    const res: any = await api.cleanupQuickReplyDuplicates();
    message.success(`Removed ${res?.deleted ?? 0} duplicate quick replies`);
    load();
  };
  const deleteAllQuickReplies = async () => {
    const res: any = await api.deleteAllQuickReplies();
    message.success(`Deleted ${res?.deleted ?? 0} quick replies`);
    load();
  };
  const save = async () => {
    const values = await form.validateFields();
    if (editing) {
      const updated = await api.update(resource, editing.id, values);
      setRows((r) => r.map((x) => (x.id === editing.id ? { ...x, ...(updated as any) } : x)));
      message.success("Updated");
    } else {
      const created = (await api.create(resource, values)) as T;
      setRows((r) => [created, ...r]);
      message.success("Created");
    }
    setDrawerOpen(false);
  };

  const cols: ColumnsType<T> = [
    ...columns,
    {
      title: "Actions",
      key: "_actions",
      width: 140,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Popconfirm title="Delete this item?" onConfirm={() => remove(row)} okText="Delete" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="bdg-filters">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          placeholder="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Draft" },
            { value: "pending", label: "Pending" },
          ]}
        />
        <Select
          value={pageSize}
          onChange={setPageSize}
          style={{ width: 120 }}
          options={[20, 50, 100].map((n) => ({ value: n, label: `${n} / page` }))}
        />
        <div style={{ flex: 1 }} />
        <Space wrap>
          {selectedRowKeys.length > 0 && <Popconfirm title={`Delete ${selectedRowKeys.length} selected record(s)?`} onConfirm={bulkDelete} okButtonProps={{ danger: true }}><Button danger icon={<DeleteOutlined />}>Delete selected</Button></Popconfirm>}
          {enableDuplicateCleanup && <Button icon={<ClearOutlined />} onClick={cleanupDuplicates}>Remove duplicates</Button>}
          {enableDeleteAll && <Popconfirm title="Delete ALL quick replies?" onConfirm={deleteAllQuickReplies} okButtonProps={{ danger: true }}><Button danger>Delete all</Button></Popconfirm>}
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
          <Button icon={<ExportOutlined />}>Export</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{createLabel}</Button>
        </Space>
      </div>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

      {loading ? (
        <div style={{ padding: 16, background: "var(--navy-800)", border: "1px solid var(--border-dim)", borderRadius: 8 }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, background: "var(--navy-800)", border: "1px solid var(--border-dim)", borderRadius: 8 }}>
          <Empty description={<span style={{ color: "#8ea0bd" }}>No records found</span>} />
        </div>
      ) : (
        <Table
          className="bdg-table"
          rowKey="id"
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={cols}
          dataSource={filtered}
          size="middle"
          pagination={{ pageSize, showSizeChanger: false, showTotal: (t) => `${t} records` }}
        />
      )}

      <Drawer
        title={editing ? "Edit record" : createLabel}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={<Space><Button onClick={() => setDrawerOpen(false)}>Cancel</Button><Button type="primary" onClick={save}>Save</Button></Space>}
      >
        <Form layout="vertical" form={form}>
          {editableFields.map((f) => (
            <Form.Item key={f.name} label={f.label} name={f.name} extra={f.help} rules={f.required === false ? [] : [{ required: true, message: `${f.label} required` }]}>
              {f.type === "textarea" ? <Input.TextArea rows={f.rows || 4} /> : f.type === "select" ? <Select options={(f.options || []).map((o) => ({ value: o, label: o }))} /> : f.type === "number" ? <Input type="number" /> : <Input />}
            </Form.Item>
          ))}
        </Form>
      </Drawer>
    </>
  );
}
