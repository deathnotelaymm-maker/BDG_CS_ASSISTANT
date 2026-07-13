import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Alert, Button, Drawer, Popconfirm, Segmented, Space, Table, Tag, message } from "antd";
import { EyeOutlined, ReloadOutlined, RollbackOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/prompt-history")({ component: VersionHistoryPage });

function VersionHistoryPage() {
  const [mode,setMode] = useState<"all"|"prompt">("all");
  const [rows,setRows] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);
  const [detail,setDetail] = useState<any | null>(null);
  const load = async () => {
    setLoading(true);
    try {
      const data = mode === "prompt" ? await api.list("prompt-history") : await api.listContentVersions();
      setRows(data as any[]);
    } catch (error:any) { message.error(error?.message || "Failed to load version history"); }
    finally { setLoading(false); }
  };
  useEffect(()=>{load();},[mode]);
  const restore = async (row:any) => {
    try {
      if (mode === "prompt") await api.restorePromptVersion(row.prompt_id,row.id); else await api.restoreContentVersion(row.id);
      message.success("Version restored and a new audit snapshot was created"); await load();
    } catch (error:any) { message.error(error?.message || "Restore failed"); }
  };
  return <>
    <Alert showIcon type="info" style={{marginBottom:12}} message="Version History is now visible and restorable" description="AI knowledge, Guides, Site Content, Buttons, and AI Prompt Manager versions are preserved. Restoring never erases later history." />
    <div className="bdg-filters" style={{marginBottom:12}}><Segmented value={mode} onChange={(value)=>setMode(value as any)} options={[{value:"all",label:"Content versions"},{value:"prompt",label:"Prompt Manager versions"}]} /><div style={{flex:1}}/><Button icon={<ReloadOutlined/>} onClick={load}>Refresh</Button></div>
    <Table rowKey="id" loading={loading} dataSource={rows} pagination={{pageSize:25}} columns={[
      {title:"Type",render:(_:any,row:any)=><Tag color="blue">{mode === "prompt" ? "AI prompt" : row.entity_type}</Tag>},
      {title:"Content",render:(_:any,row:any)=><div><b>{row.title || row.section || row.section_key}</b><div style={{color:"#8ea0bd",fontSize:12}}>{row.change_note || "saved"}</div></div>},
      {title:"Version",width:100,render:(_:any,row:any)=><Tag>v{row.version_number || row.version || row.id}</Tag>},
      {title:"Editor",width:190,render:(_:any,row:any)=>row.actor_email || row.editor || "admin"},
      {title:"Changed",width:210,render:(_:any,row:any)=>new Date(row.created_at || row.changedAt).toLocaleString()},
      {title:"Actions",width:175,render:(_:any,row:any)=><Space><Button size="small" icon={<EyeOutlined/>} onClick={()=>setDetail(row)}>View</Button><Popconfirm title="Restore this version?" description="A new version will be created from the restored content." onConfirm={()=>restore(row)}><Button size="small" icon={<RollbackOutlined/>}>Restore</Button></Popconfirm></Space>},
    ]}/>
    <Drawer open={!!detail} onClose={()=>setDetail(null)} width={760} title="Version snapshot"><pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",fontSize:12}}>{detail ? JSON.stringify(detail.snapshot || detail.snapshot_json || detail,null,2) : ""}</pre></Drawer>
  </>;
}
