import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Alert, Button, Input, Space, message } from "antd";
import DataPage from "@/components/DataPage";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/site-content")({ component: SiteContentPage });
function SiteContentPage() {
  const [restoreKey,setRestoreKey] = useState("");
  const restore = async () => { if (!restoreKey.trim()) return; try { await api.restoreSiteContent(restoreKey.trim()); message.success("Deleted key restored. Refreshing the table will show it."); setRestoreKey(""); } catch(error:any){ message.error(error?.message || "Restore failed"); } };
  return <>
    <Alert showIcon type="success" message="Guide Page content is connected live with durable deletion" description="Save publishes immediately. Delete creates a tombstone, so startup defaults cannot recreate the key after refresh or deployment." style={{marginBottom:12}} />
    <Space.Compact style={{width:"100%",marginBottom:12}}><Input value={restoreKey} onChange={(event)=>setRestoreKey(event.target.value)} onPressEnter={restore} placeholder="Deleted content key to restore (optional)"/><Button onClick={restore}>Restore deleted key</Button></Space.Compact>
    <DataPage resource="site-content" createLabel="New content key" columns={[{title:"Key",dataIndex:"key",width:220},{title:"Value",dataIndex:"value"},{title:"Type",dataIndex:"input_type",width:110},{title:"Updated",dataIndex:"updatedAt",width:180}]} editableFields={[{name:"key",label:"Content key"},{name:"label",label:"Admin label"},{name:"value",label:"Value",type:"textarea"},{name:"input_type",label:"Input type",type:"select",options:["text","textarea","url"]}]} />
  </>;
}
