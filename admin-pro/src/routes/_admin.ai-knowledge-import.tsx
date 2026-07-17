import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { CloudUploadOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, FileExcelOutlined, ReloadOutlined, RollbackOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/ai-knowledge-import")({ component: AiKnowledgeImportPage });

const { Dragger } = Upload;

function statusColor(status?: string) {
  if (["valid", "draft_created", "drafted", "active"].includes(String(status))) return "green";
  if (["error", "conflict", "rolled_back", "archived"].includes(String(status))) return "red";
  return "gold";
}

function AiKnowledgeImportPage() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [platformKey, setPlatformKey] = useState("default");
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [importProgress, setImportProgress] = useState({ percent: 0, stage: "" });
  const [selected, setSelected] = useState<any | null>(null);
  const [platformEditor, setPlatformEditor] = useState<any | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [platformRows, batchRows] = await Promise.all([api.listSupportPlatforms(), api.listKnowledgeImports()]);
      setPlatforms(platformRows as any[]);
      setBatches(batchRows as any[]);
      if (!(platformRows as any[]).some((platform) => platform.platform_key === platformKey && platform.status === "active")) {
        setPlatformKey((platformRows as any[]).find((platform) => platform.status === "active")?.platform_key || "default");
      }
    } catch (error: any) {
      message.error(error?.message || "Could not load AI import studio");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openBatch = async (id: number) => {
    try { setSelected(await api.getKnowledgeImport(id)); }
    catch (error: any) { message.error(error?.message || "Could not open import batch"); }
  };

  const chooseFile = async (file: File) => {
    if (!/\.xlsx$/i.test(file.name)) {
      message.error("Choose an .xlsx workbook. Export old .xls files as .xlsx first.");
      return Upload.LIST_IGNORE;
    }
    setPreviewing(true);
    setImportProgress({ percent: 12, stage: "Uploading workbook…" });
    try {
      const batch = await api.previewKnowledgeImport(file, platformKey);
      setImportProgress({ percent: 72, stage: "Validating rows and image roles…" });
      message.success(`Preview created: ${batch.valid_rows} valid row(s), ${batch.error_rows} issue(s)`);
      await load();
      await openBatch(batch.id);
      setImportProgress({ percent: 100, stage: "Review ready" });
    } catch (error: any) {
      message.error(error?.message || "Workbook preview failed");
    } finally {
      setTimeout(() => setPreviewing(false), 250);
    }
    return Upload.LIST_IGNORE;
  };

  const createDrafts = async () => {
    if (!selected?.id) return;
    try {
      const result = await api.createKnowledgeImportDrafts(selected.id);
      message.success(`Created ${result.created || 0} draft(s). ${result.conflicts || 0} protected conflict(s).`);
      await load();
      await openBatch(selected.id);
    } catch (error: any) { message.error(error?.message || "Could not create drafts"); }
  };

  const rollback = async () => {
    if (!selected?.id) return;
    try {
      const result = await api.rollbackKnowledgeImport(selected.id);
      message.success(`Archived ${result.archived_drafts || 0} unapproved imported draft(s).`);
      await load();
      await openBatch(selected.id);
    } catch (error: any) { message.error(error?.message || "Rollback failed"); }
  };

  const openPlatform = (platform?: any) => {
    const value = platform || { platform_key: "", name: "", support_mode: "none", status: "active", default_locale: "en-US", supported_languages: "en-US", ticket_url: "", support_url: "" };
    setPlatformEditor(value);
    form.setFieldsValue(value);
  };
  const savePlatform = async () => {
    const values = await form.validateFields();
    try {
      if (platformEditor?.id) await api.update("support-platforms", platformEditor.id, values);
      else await api.create("support-platforms", values);
      message.success(platformEditor?.id ? "Platform updated" : "Platform created");
      setPlatformEditor(null);
      await load();
    } catch (error: any) { message.error(error?.message || "Platform save failed"); }
  };
  const removePlatform = async (platform: any) => {
    try { await api.remove("support-platforms", platform.id); message.success("Platform archived"); await load(); }
    catch (error: any) { message.error(error?.message || "Could not archive platform"); }
  };

  const importRows = useMemo(() => selected?.preview_rows || [], [selected]);

  return <>
    <Alert
      showIcon
      type="info"
      message="Advanced AI Knowledge Import"
      description="Excel never goes live by itself. First preview it, then create AI Content drafts. Review the imported item in AI Prompt & Image, set Knowledge approval to Approved and Status to Published, and only then the AI may use it."
      style={{ marginBottom: 12 }}
    />
    <Row gutter={[12, 12]}>
      <Col xs={24} xl={15}>
        <Card className="bdg-card" title="1. Import an Excel knowledge workbook" extra={<Space><Button icon={<DownloadOutlined />} onClick={() => api.downloadKnowledgeImportTemplate().catch((error: any) => message.error(error?.message || "Template download failed"))}>Example template</Button><Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button></Space>}>
          <Space direction="vertical" size={14} style={{ width:"100%" }}>
            <div>
              <Typography.Text strong>Target support platform</Typography.Text>
              <Select style={{ width:"100%", marginTop:6 }} value={platformKey} onChange={setPlatformKey} options={platforms.filter((platform) => platform.status === "active").map((platform) => ({ value:platform.platform_key, label:`${platform.name} — ${platform.support_mode === "none" ? "No ticket system" : platform.support_mode === "tickets" ? "Tickets" : "Hybrid"}` }))} />
            </div>
            <Dragger accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" maxCount={1} beforeUpload={chooseFile} showUploadList={false} disabled={previewing}>
              <p className="ant-upload-drag-icon"><FileExcelOutlined /></p>
              <p className="ant-upload-text">Drop your .xlsx file here or click to select it</p>
              <p className="ant-upload-hint">Recognized columns: Question, Answer, Positive/Negative examples, AI instruction, Image URL, Image role, Image alt/caption/placement, Ticket, Locale, and Platform.</p>
            </Dragger>
            <Alert showIcon type="warning" message="Photos and ticket labels are review notes" description="The importer does not fetch unknown image URLs or create tickets automatically. Upload images in the visual editor, and bind a ticket label to an approved Button only where the selected platform supports tickets." />
          </Space>
        </Card>
      </Col>
      <Col xs={24} xl={9}>
        <Card className="bdg-card" title="Support platform profiles">
          <Table size="small" loading={loading} rowKey="id" dataSource={platforms} pagination={false} columns={[
            { title:"Platform", render:(_:any,row:any)=><div><b>{row.name}</b><div style={{color:"#8ea0bd",fontSize:12}}>{row.platform_key}</div></div> },
            { title:"Mode", render:(_:any,row:any)=><Tag color={row.support_mode === "none" ? "default" : "blue"}>{row.support_mode}</Tag> },
            { title:"", width:95, render:(_:any,row:any)=><Space><Button size="small" icon={<EditOutlined />} onClick={()=>openPlatform(row)} /><Popconfirm disabled={row.platform_key === "default"} title="Archive this platform?" onConfirm={()=>removePlatform(row)}><Button size="small" danger disabled={row.platform_key === "default"} icon={<DeleteOutlined />} /></Popconfirm></Space> },
          ] as any} />
        </Card>
      </Col>
    </Row>

    <Card className="bdg-card" title="Import history" style={{ marginTop:12 }}>
      <Table rowKey="id" loading={loading} dataSource={batches} pagination={{ pageSize:10 }} columns={[
        { title:"Workbook", render:(_:any,row:any)=><div><b>{row.filename}</b><div style={{color:"#8ea0bd",fontSize:12}}>{row.platform_key} · {row.created_at}</div></div> },
        { title:"Rows", render:(_:any,row:any)=><Space><Tag color="green">{row.valid_rows} valid</Tag>{row.error_rows ? <Tag color="red">{row.error_rows} issue(s)</Tag> : null}</Space> },
        { title:"State", render:(_:any,row:any)=><Space direction="vertical" size={2}><Tag color={statusColor(row.status)}>{row.status}</Tag>{row.current_stage && row.current_stage !== "complete" ? <Progress percent={Number(row.progress_percent || 0)} size="small" status="active" /> : null}</Space> },
        { title:"Actions", width:180, render:(_:any,row:any)=><Button size="small" icon={<EyeOutlined />} onClick={()=>openBatch(row.id)}>Review</Button> },
      ] as any} />
    </Card>

    <Drawer open={!!selected} onClose={()=>setSelected(null)} width="min(1280px, 97vw)" title={selected ? `Review import — ${selected.filename}` : "Review import"} extra={<Space>{selected?.status !== "rolled_back" && <Popconfirm title="Archive only the imported drafts that are still unapproved?" onConfirm={rollback}><Button danger icon={<RollbackOutlined />}>Rollback drafts</Button></Popconfirm>}<Button type="primary" disabled={!selected?.valid_rows || selected?.status === "rolled_back"} icon={<CloudUploadOutlined />} onClick={createDrafts}>Create AI Content drafts</Button></Space>}>
      {selected && <>
        <Descriptions size="small" bordered column={{ xs:1, sm:2, md:4 }} items={[
          { key:"platform",label:"Platform",children:selected.platform_key },
          { key:"state",label:"State",children:<Tag color={statusColor(selected.status)}>{selected.status}</Tag> },
          { key:"valid",label:"Valid rows",children:selected.valid_rows },
          { key:"errors",label:"Issues",children:selected.error_rows },
          { key:"progress",label:"Import progress",children:<Space><Progress percent={Number(selected.progress_percent || 100)} size="small" />{selected.current_stage}</Space> },
        ]} />
        {selected.summary?.sheet_errors?.length ? <Alert type="warning" showIcon style={{marginTop:12}} message="Sheets with missing columns" description={selected.summary.sheet_errors.map((issue:any)=>`${issue.sheet_name}: ${issue.error}`).join(" · ")} /> : null}
        <Alert type="info" showIcon style={{marginTop:12}} message="What happens next" description="Create AI Content drafts does not enable AI answers. It gives you editable drafts. Open each one in AI Prompt & Image, add optional visual knowledge and approved buttons, then approve and publish it." />
        <Table style={{marginTop:12}} rowKey="id" size="small" scroll={{x:1050}} dataSource={importRows} pagination={{pageSize:20}} columns={[
          { title:"Sheet / row", width:120, render:(_:any,row:any)=><div>{row.sheet_name}<div style={{color:"#8ea0bd"}}>row {row.row_number}</div></div> },
          { title:"Question", width:240, render:(_:any,row:any)=><Typography.Paragraph ellipsis={{ rows:3, tooltip:row.mapped?.question }}>{row.mapped?.question || "—"}</Typography.Paragraph> },
          { title:"Approved answer", width:330, render:(_:any,row:any)=><Typography.Paragraph ellipsis={{ rows:4, tooltip:row.mapped?.answer }}>{row.mapped?.answer || "—"}</Typography.Paragraph> },
          { title:"Ticket / image notes", width:220, render:(_:any,row:any)=><Space direction="vertical" size={2}>{row.mapped?.ticket_label ? <Tag color="gold">Ticket: {row.mapped.ticket_label}</Tag> : null}{row.mapped?.image_ref ? <Tag color="blue">Image: {row.mapped.image_ref}</Tag> : null}{row.mapped?.image_role ? <Tag color="cyan">Role: {row.mapped.image_role}</Tag> : null}{row.mapped?.image_placement ? <Typography.Text type="secondary" style={{fontSize:11}}>Placement: {row.mapped.image_placement}</Typography.Text> : null}{(row.warnings || []).map((warning:string)=><Typography.Text key={warning} type="secondary" style={{fontSize:11}}>{warning}</Typography.Text>)}</Space> },
          { title:"Validation", width:150, render:(_:any,row:any)=><Space direction="vertical" size={2}><Tag color={statusColor(row.status)}>{row.status}</Tag>{row.validation_error ? <Typography.Text type="danger" style={{fontSize:11}}>{row.validation_error}</Typography.Text> : null}</Space> },
        ] as any} />
      </>}
    </Drawer>

    <Modal open={!!platformEditor} title={platformEditor?.id ? "Edit support platform" : "Create support platform"} onCancel={()=>setPlatformEditor(null)} onOk={savePlatform} okText="Save platform">
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Platform name" rules={[{required:true}]}><Input placeholder="BDG India app" /></Form.Item>
        <Form.Item name="platform_key" label="Stable key" rules={[{required:true}]}><Input placeholder="bdg-india" /></Form.Item>
        <Row gutter={12}><Col span={12}><Form.Item name="support_mode" label="Support mode"><Select options={[{value:"none",label:"No ticket system"},{value:"tickets",label:"Ticket system"},{value:"hybrid",label:"Ticket + normal support"}]} /></Form.Item></Col><Col span={12}><Form.Item name="status" label="Status"><Select options={[{value:"active",label:"Active"},{value:"inactive",label:"Inactive"}]} /></Form.Item></Col></Row>
        <Form.Item name="ticket_url" label="Ticket URL (optional)"><Input placeholder="https://app.example.com/tickets/new" /></Form.Item>
        <Form.Item name="support_url" label="Normal support URL (optional)"><Input placeholder="https://t.me/official_support" /></Form.Item>
        <Form.Item name="default_locale" label="Default language" rules={[{required:true}]}><Input placeholder="en-US, th, my-MM" /></Form.Item>
        <Form.Item name="supported_languages" label="Supported languages" extra="Comma-separated BCP-47 codes"><Input placeholder="en-US, th, my-MM" /></Form.Item>
      </Form>
    </Modal>
    <Modal open={previewing} closable={false} footer={null} centered title="Preparing knowledge preview">
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        <Progress percent={importProgress.percent} status="active" />
        <Typography.Text>{importProgress.stage || "Reading workbook…"}</Typography.Text>
        <Typography.Text type="secondary">Images are recorded with their role and placement for review. Nothing is published automatically.</Typography.Text>
      </Space>
    </Modal>
  </>;
}
