import { randomUUID } from 'node:crypto';
import { requestPublicHttpsText, validatePublicHttpsUrl } from './network-safety.js';

export const COMMERCE_READ_TOOLS = Object.freeze([
  'customer.get','orders.list','order.get','order.status','payment.status','delivery.status',
]);
const TOOL_SET = new Set(COMMERCE_READ_TOOLS);
const tokenCache = new Map();

function fail(message,status=400,code='COMMERCE_CONNECTOR_INVALID') { const e=new Error(message);e.status=status;e.code=code;throw e; }
function parseJson(value,fallback=null){try{return JSON.parse(String(value||''));}catch{return fallback;}}
function tools(value){const raw=Array.isArray(value)?value:parseJson(value,[]);const out=[...new Set((raw||[]).map(x=>String(x||'').trim()).filter(x=>TOOL_SET.has(x)))];return out;}
function connectorOut(row){return {ok:true,configured:!!row,enabled:row?.enabled===true,ai_enabled:row?.ai_enabled===true,shop_backend_url:row?.shop_backend_url||'',credential_configured:!!row?.service_credential_encrypted,allowed_tools:tools(row?.allowed_tools),request_timeout_ms:Number(row?.request_timeout_ms||5000),last_health_status:row?.last_health_status||'',last_health_at:row?.last_health_at?String(row.last_health_at):'',last_error_code:row?.last_error_code||'',updated_at:row?.updated_at?String(row.updated_at):''};}

export async function getCommerceConnector(query,scope){const row=(await query(`SELECT * FROM platform_commerce_connectors WHERE tenant_id=$1 AND platform_id=$2 LIMIT 1`,[scope.tenant_id,scope.platform_id])).rows[0];return {...connectorOut(row),platform:{id:scope.platform_id,name:scope.platform_name,route_key:scope.public_route_key}};}

export async function updateCommerceConnector({query,encryptSecret,audit},scope,payload={}){
 if(!scope?.can_manage_platform)fail('Platform manager permission required',403,'PLATFORM_MANAGER_REQUIRED');
 const url=payload.shop_backend_url===undefined?undefined:await validatePublicHttpsUrl(payload.shop_backend_url,'Luke Shop backend URL');
 const current=(await query(`SELECT * FROM platform_commerce_connectors WHERE tenant_id=$1 AND platform_id=$2 LIMIT 1`,[scope.tenant_id,scope.platform_id])).rows[0];
 const allowed=payload.allowed_tools===undefined?tools(current?.allowed_tools):tools(payload.allowed_tools);
 if(Array.isArray(payload.allowed_tools)&&allowed.length!==payload.allowed_tools.length)fail('Only approved read-only Luke Shop tools are allowed',400,'COMMERCE_TOOL_INVALID');
 const credential=Object.prototype.hasOwnProperty.call(payload,'service_credential')?await encryptSecret(payload.service_credential):(current?.service_credential_encrypted||'');
 const backend=url===undefined?(current?.shop_backend_url||''):url;
 const timeout=Math.max(1500,Math.min(10000,Number(payload.request_timeout_ms??current?.request_timeout_ms??5000)));
 const enabled=payload.enabled===undefined?current?.enabled===true:payload.enabled===true;
 const aiEnabled=payload.ai_enabled===undefined?current?.ai_enabled===true:payload.ai_enabled===true;
 if((enabled||aiEnabled)&&!backend)fail('Luke Shop backend URL is required before enabling the Commerce Connector');
 if(aiEnabled&&!credential)fail('A Luke Shop AI service credential is required before AI commerce access can be enabled');
 const row=(await query(`INSERT INTO platform_commerce_connectors(tenant_id,platform_id,enabled,ai_enabled,shop_backend_url,service_credential_encrypted,allowed_tools,request_timeout_ms,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,NOW()) ON CONFLICT(platform_id) DO UPDATE SET enabled=EXCLUDED.enabled,ai_enabled=EXCLUDED.ai_enabled,shop_backend_url=EXCLUDED.shop_backend_url,service_credential_encrypted=EXCLUDED.service_credential_encrypted,allowed_tools=EXCLUDED.allowed_tools,request_timeout_ms=EXCLUDED.request_timeout_ms,updated_at=NOW() RETURNING *`,[scope.tenant_id,scope.platform_id,enabled,aiEnabled,backend,credential,JSON.stringify(allowed),timeout])).rows[0];
 tokenCache.delete(String(scope.platform_id));
 if(audit)await audit('update','commerce_connector',scope.platform_id,JSON.stringify({enabled,ai_enabled:aiEnabled,allowed_tools:allowed,request_timeout_ms:timeout}),scope);
 return connectorOut(row);
}

async function writeAudit(query,scope,data){try{await query(`INSERT INTO commerce_connector_audit_logs(tenant_id,platform_id,action,tool_name,status,request_id,target_ref,duration_ms,error_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[scope.tenant_id,scope.platform_id,data.action||'',data.tool||null,data.status||'',data.request_id||'',data.target_ref||null,Math.max(0,Math.round(data.duration_ms||0)),data.error_code||null]);}catch{}}

function endpoint(base,path){const u=new URL(base);u.pathname=path;u.search='';u.hash='';return u.toString();}
async function jsonRequest(url,{method='POST',headers={},body=null,timeoutMs=5000,label='Luke Shop Commerce Connector'}={}){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{const raw=body===null?'':JSON.stringify(body);const h={Accept:'application/json',...headers};if(body!==null)h['Content-Type']='application/json';const res=await requestPublicHttpsText(url,{method,headers:h,body:raw,signal:controller.signal,maxBytes:1_000_000,label});const data=parseJson(res.text,{});return {...res,data};}finally{clearTimeout(timer);}
}

async function mintServiceToken({row,decryptSecret,scope,query,force=false}){
 const key=String(scope.platform_id),cached=tokenCache.get(key);if(!force&&cached&&cached.expiresAt>Date.now()+15000)return cached.token;
 const credential=await decryptSecret(row.service_credential_encrypted);if(!credential)fail('Commerce Connector credential cannot be decrypted',503,'COMMERCE_CREDENTIAL_UNAVAILABLE');
 const res=await jsonRequest(endpoint(row.shop_backend_url,'/v1/customer-service/auth/token'),{headers:{Authorization:`Bearer ${credential}`},timeoutMs:Number(row.request_timeout_ms||5000),label:'Luke Shop service-token endpoint'});
 if(!res.ok||!res.data?.data?.access_token){await writeAudit(query,scope,{action:'service_token',status:'failed',request_id:randomUUID(),duration_ms:0,error_code:res.data?.error?.code||`HTTP_${res.status}`});fail('Luke Shop service-token exchange failed',502,'COMMERCE_SERVICE_TOKEN_FAILED');}
 const ttl=Math.max(30,Number(res.data.data.expires_in||180));tokenCache.set(key,{token:res.data.data.access_token,expiresAt:Date.now()+ttl*1000});return res.data.data.access_token;
}

async function loadRow(query,scope){return (await query(`SELECT * FROM platform_commerce_connectors WHERE tenant_id=$1 AND platform_id=$2 LIMIT 1`,[scope.tenant_id,scope.platform_id])).rows[0]||null;}

export async function testCommerceConnector({query,decryptSecret},scope){const started=Date.now(),requestId=randomUUID();const row=await loadRow(query,scope);if(!row)fail('Commerce Connector is not configured',400,'COMMERCE_NOT_CONFIGURED');try{const token=await mintServiceToken({row,decryptSecret,scope,query,force:true});const res=await jsonRequest(endpoint(row.shop_backend_url,'/v1/customer-service/capabilities'),{method:'GET',headers:{Authorization:`Bearer ${token}`},timeoutMs:Number(row.request_timeout_ms||5000),label:'Luke Shop capabilities endpoint'});const status=res.ok?'healthy':'failed';await query(`UPDATE platform_commerce_connectors SET last_health_status=$1,last_health_at=NOW(),last_error_code=$2,updated_at=NOW() WHERE platform_id=$3`,[status,res.ok?null:(res.data?.error?.code||`HTTP_${res.status}`),scope.platform_id]);await writeAudit(query,scope,{action:'test',status,request_id:requestId,duration_ms:Date.now()-started,error_code:res.ok?null:(res.data?.error?.code||`HTTP_${res.status}`)});return {ok:res.ok,status,http_status:res.status,capabilities:res.data?.data?.capabilities||{},granted_scopes:res.data?.data?.granted_scopes||[],usage_mode:res.data?.data?.usage_mode||''};}catch(error){await writeAudit(query,scope,{action:'test',status:'failed',request_id:requestId,duration_ms:Date.now()-started,error_code:error?.code||'CONNECTOR_TEST_FAILED'});throw error;}}

export async function listCommerceAudit(query,scope){const rows=(await query(`SELECT id,action,tool_name,status,request_id,target_ref,duration_ms,error_code,created_at FROM commerce_connector_audit_logs WHERE tenant_id=$1 AND platform_id=$2 ORDER BY id DESC LIMIT 100`,[scope.tenant_id,scope.platform_id])).rows;return {ok:true,rows};}

function orderReference(message){
 const raw=String(message||'');
 const numbered=raw.match(/\bLS\d{14}[0-9A-F]{8}\b/i)?.[0];
 if(numbered)return numbered.toUpperCase();
 return raw.match(/\bord_[A-Za-z0-9_-]{6,120}\b/)?.[0]||'';
}
function intent(message,currentOrderRef=''){
 const raw=String(message||'');const text=raw.toLowerCase();
 const commerce=/\b(order|delivery|deliver|tracking|track|shipped|shipping|rider|prepar|ready|download|payment|paid|refund|refunded|customer id|member id|my id)\b/.test(text);
 if(!commerce)return null;
 if(/\b(customer id|member id|my id)\b/.test(text))return {tool:'customer.get',args:{}};
 const ref=orderReference(raw)||String(currentOrderRef||'').trim();
 if(/\b(payment|paid|pay status|refund|refunded)\b/.test(text))return ref?{tool:'payment.status',args:{order_ref:ref}}:{tool:'orders.list',args:{limit:5},follow:'payment.status'};
 if(/\b(delivery|deliver|tracking|track|shipped|shipping|rider|ready)\b/.test(text))return ref?{tool:'delivery.status',args:{order_ref:ref}}:{tool:'orders.list',args:{limit:5},follow:'delivery.status'};
 return ref?{tool:'order.status',args:{order_ref:ref}}:{tool:'orders.list',args:{limit:5},follow:'order.status'};
}
function preferredOrder(list){const rows=list?.orders||[];return rows.find(o=>!['COMPLETED','CANCELLED','FAILED'].includes(String(o.status||'').toUpperCase()))||rows[0]||null;}

async function executeTool({query,decryptSecret},scope,row,contextToken,tool,args,targetRef=''){
 const started=Date.now(),requestId=randomUUID();if(!tools(row.allowed_tools).includes(tool))return {status:'denied',tool,error_code:'COMMERCE_TOOL_NOT_ALLOWED'};
 let token=await mintServiceToken({row,decryptSecret,scope,query});
 for(let attempt=0;attempt<2;attempt+=1){const nonce=randomUUID();const res=await jsonRequest(endpoint(row.shop_backend_url,'/v1/customer-service/tools/execute'),{headers:{Authorization:`Bearer ${token}`,'X-Luke-Shop-Context':contextToken,'X-Luke-Request-Timestamp':String(Date.now()),'X-Luke-Request-Nonce':nonce,'X-Luke-CS-Request-ID':requestId},body:{tool,arguments:args},timeoutMs:Number(row.request_timeout_ms||5000),label:'Luke Shop read-only tool gateway'});if(res.ok){await writeAudit(query,scope,{action:'tool_execute',tool,status:'success',request_id:requestId,target_ref:targetRef,duration_ms:Date.now()-started});return {status:'success',tool,result:res.data?.data?.result||null,request_id:requestId};}const code=res.data?.error?.code||res.data?.code||`HTTP_${res.status}`;if(attempt===0&&res.status===401){token=await mintServiceToken({row,decryptSecret,scope,query,force:true});continue;}await writeAudit(query,scope,{action:'tool_execute',tool,status:'failed',request_id:requestId,target_ref:targetRef,duration_ms:Date.now()-started,error_code:code});return {status:'failed',tool,error_code:code,http_status:res.status};}
 return {status:'failed',tool,error_code:'COMMERCE_TOOL_FAILED'};
}

export async function resolveCommerceFacts({query,decryptSecret},scope,{message,contextToken,currentOrderRef=''}){
 const requested=intent(message,currentOrderRef);if(!requested||!contextToken)return null;const row=await loadRow(query,scope);if(!row||row.enabled!==true||row.ai_enabled!==true)return null;
 let first=await executeTool({query,decryptSecret},scope,row,contextToken,requested.tool,requested.args,currentOrderRef);
 if(first.status!=='success')return {ok:false,intent:requested,tool:first.tool,error_code:first.error_code||'COMMERCE_LOOKUP_FAILED'};
 if(requested.follow&&first.tool==='orders.list'){const order=preferredOrder(first.result);if(order){const ref=order.order_number||order.id;const next=await executeTool({query,decryptSecret},scope,row,contextToken,requested.follow,{order_ref:ref},ref);if(next.status==='success')return {ok:true,intent:{...requested,resolved_order_ref:ref},tool:next.tool,result:next.result};}}
 return {ok:true,intent:requested,tool:first.tool,result:first.result};
}

export function commerceFactsForPrompt(facts){if(!facts?.ok)return '';return JSON.stringify({source:'LUKE_SHOP_VERIFIED_READ_ONLY',tool:facts.tool,result:facts.result});}
export function commerceFallbackText(facts){if(!facts?.ok)return '';const r=facts.result||{};if(facts.tool==='customer.get')return r.customer_code?`Your customer ID is ${r.customer_code}.`:'Your customer account is connected to this support chat.';if(facts.tool==='order.status'){const parts=[`Order ${r.order_number||r.id||''} is currently ${String(r.status||'').replaceAll('_',' ').toLowerCase()}.`];const active=(r.fulfillments||[])[0];if(active?.fulfillment_type)parts.push(`${String(active.fulfillment_type).replaceAll('_',' ').toLowerCase()} status: ${String(active.status||'').replaceAll('_',' ').toLowerCase()}.`);return parts.join(' ');}if(facts.tool==='payment.status'){const refunded=Number(r.refunded_amount||0);return `Payment status: ${String(r.status||'unknown').replaceAll('_',' ').toLowerCase()}.${refunded>0?` Refunded amount: ${refunded} ${r.currency||''}.`:''}`;}if(facts.tool==='delivery.status'){const f=(r.fulfillments||[])[0];if(!f)return 'No delivery or fulfillment record is available for this order yet.';return `${String(f.workflow?.label||f.fulfillment_type||'Fulfillment')} is currently ${String(f.status||'').replaceAll('_',' ').toLowerCase()}.${f.tracking_number?` Tracking number: ${f.tracking_number}.`:''}`;}if(facts.tool==='orders.list'){const o=(r.orders||[])[0];return o?`Your latest order ${o.order_number||o.id} is currently ${String(o.status||'').replaceAll('_',' ').toLowerCase()}.`:'I could not find a recent order for this store.';}return 'I found your current Shop information.';}
