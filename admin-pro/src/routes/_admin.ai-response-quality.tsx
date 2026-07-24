import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Checkbox, Form, Input, Select, Space, Statistic, Table, Tabs, Tag, message } from "antd";
import { BugOutlined, CheckCircleOutlined, ReloadOutlined, ScanOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import LocalizedHelp from "@/components/LocalizedHelp";

export const Route = createFileRoute("/_admin/ai-response-quality")({ component: AiResponseQualityPage });

const sourceLabels: Record<string, string> = { prompt_image: "AI Prompt & Image", qa: "AI Q&A", faq: "FAQ", guide: "Guide", knowledge: "Knowledge" };

function csv(value: string) { return String(value || "").split(",").map((item) => item.trim()).filter(Boolean); }

function AiResponseQualityPage() {
  const [overview, setOverview] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [lastRun, setLastRun] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [summary, findingResult, testResult] = await Promise.all([api.getAiQualityOverview(), api.listAiQualityFindings(), api.listAiQualityTestCases()]);
      setOverview(summary); setFindings(findingResult.findings || []); setTestCases(testResult.test_cases || []);
    } catch (error: any) { message.error(error?.message || "Could not load AI Response Quality Center"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const scan = async () => {
    setScanning(true);
    try { const result = await api.scanAiQuality({ include_drafts: includeDrafts }); setFindings(result.findings || []); message.success(`Quality scan complete: ${result.scan?.finding_count || 0} finding(s)`); await load(); }
    catch (error: any) { message.error(error?.message || "Quality scan failed"); }
    finally { setScanning(false); }
  };
  const createTest = async () => {
    try {
      const values = await form.validateFields();
      await api.createAiQualityTestCase({ ...values, required_facts: csv(values.required_facts), forbidden_phrases: csv(values.forbidden_phrases), expected_image_roles: csv(values.expected_image_roles), expected_image_ids: csv(values.expected_image_ids) });
      form.resetFields(); message.success("AI quality test case saved"); await load();
    } catch (error: any) { if (error?.errorFields) return; message.error(error?.message || "Could not save test case"); }
  };
  const runTest = async (id: number) => { try { const result = await api.runAiQualityTest(id); setLastRun(result.run); message.success(`Test ${result.run?.status || "completed"}`); await load(); } catch (error: any) { message.error(error?.message || "AI quality test failed"); } };
  const resolve = async (id: number, status: string) => { try { await api.resolveAiQualityFinding(id, { status }); message.success("Finding status updated"); await load(); } catch (error: any) { message.error(error?.message || "Could not update finding"); } };

  const findingColumns = useMemo(() => [
    { title: "Severity", dataIndex: "severity", render: (value: string) => <Tag color={value === "critical" ? "red" : value === "warning" ? "orange" : "blue"}>{value}</Tag> },
    { title: "Type", dataIndex: "finding_type" },
    { title: "Summary", dataIndex: "summary" },
    { title: "Sources", dataIndex: "source_refs", render: (refs: any[]) => <Space wrap>{(refs || []).map((ref) => <Tag key={`${ref.source_type}-${ref.id}`}>{sourceLabels[ref.source_type] || ref.source_type}: {ref.title || ref.id}</Tag>)}</Space> },
    { title: "Status", dataIndex: "status" },
    { title: "Action", key: "action", render: (_: unknown, row: any) => row.status === "open" ? <Space><Button size="small" onClick={() => void resolve(row.id, "intentional")}>Mark intentional</Button><Button size="small" type="primary" onClick={() => void resolve(row.id, "resolved")}>Resolve</Button></Space> : <Tag color="green">{row.status}</Tag> },
  ], []);
  const testColumns = useMemo(() => [
    { title: "Name", dataIndex: "name" },
    { title: "Customer message", dataIndex: "message" },
    { title: "Expected source", dataIndex: "expected_source_type", render: (value: string) => value ? sourceLabels[value] || value : "Any approved source" },
    { title: "Images", dataIndex: "expected_image_mode" },
    { title: "Last run", dataIndex: "last_run_status", render: (value: string) => value ? <Tag color={value === "pass" ? "green" : "red"}>{value}</Tag> : <Tag>Not run</Tag> },
    { title: "Action", key: "action", render: (_: unknown, row: any) => <Button size="small" icon={<CheckCircleOutlined />} onClick={() => void runTest(row.id)}>Run against live router</Button> },
  ], []);
  const testSummary = overview?.summary?.tests || {};

  return <>
    <LocalizedHelp copies={{
      en: { title: "Check whether the live AI will answer correctly", body: "This center scans the active platform's published and approved AI Prompt & Image, AI Q&A, FAQ, Guide, and Knowledge sources. It detects duplicate replies, conflicting instructions, unsafe or repeated images, and missing images. It also lets you save customer messages as regression tests and run them through the same platform-scoped router used by Chat.", bullets: ["A scan is advisory: it never deletes, merges, approves, or publishes content.", "Test cases use the current platform route and cannot read BDG or another tenant.", "Resolve a finding only after you decide which source should remain authoritative in AI Source Router."] },
      zh: { title: "检查实时 AI 是否会正确回答", body: "此中心扫描当前平台已发布且已批准的 AI 提示与图片、AI 问答、FAQ、指南和知识内容，检测重复回复、冲突指令、不安全或重复图片以及缺少图片的问题。您还可以保存客户问题作为回归测试，并使用与 Chat 相同的平台路由运行测试。", bullets: ["扫描只提供建议，不会自动删除、合并、批准或发布内容。", "测试只使用当前平台路由，不能读取 BDG 或其他租户。", "请先在 AI 来源路由中决定权威来源，再解决问题。"] },
      my: { title: "Live AI က မှန်ကန်စွာ ဖြေမဖြေ စစ်ဆေးရန်", body: "ဤစင်တာသည် လက်ရှိ platform ၏ ထုတ်ဝေပြီး အတည်ပြုထားသော AI Prompt & Image၊ AI Q&A၊ FAQ၊ Guide နှင့် Knowledge ကို စစ်ဆေးပြီး ထပ်နေသောအဖြေ၊ မကိုက်ညီသော instruction၊ မလုံခြုံသည့် သို့မဟုတ် ထပ်နေသည့်ပုံများနှင့် ပုံမရှိသည့်ပြဿနာများကို ရှာဖွေမည်။ Customer message ကို regression test အဖြစ်သိမ်းပြီး Chat အသုံးပြုသည့် platform router အတိုင်း စမ်းသပ်နိုင်သည်။", bullets: ["Scan သည် အကြံပြုချက်သာဖြစ်ပြီး content ကို အလိုအလျောက် မဖျက်၊ မပေါင်း၊ မအတည်ပြု၊ မထုတ်ဝေပါ။", "Test သည် လက်ရှိ platform route ကိုသာ အသုံးပြုပြီး BDG သို့မဟုတ် အခြား tenant ကို မဖတ်နိုင်ပါ။", "ပြဿနာဖြေရှင်းမီ AI Source Router တွင် အဓိက source ကို သတ်မှတ်ပါ။"] },
    }} />
    <Card loading={loading} title={<Space><SafetyCertificateOutlined />AI Response Quality Center</Space>} extra={<Space><Checkbox checked={includeDrafts} onChange={(event) => setIncludeDrafts(event.target.checked)}>Check drafts for duplicates</Checkbox><Button icon={<ReloadOutlined />} onClick={() => void load()}>Refresh</Button><Button type="primary" icon={<ScanOutlined />} loading={scanning} onClick={() => void scan()}>Scan active platform</Button></Space>} style={{ marginBottom: 12 }}>
      <Space wrap size="large">
        <Statistic title="Open findings" value={(overview?.summary?.findings || []).filter((item: any) => item.status === "open").reduce((total: number, item: any) => total + Number(item.count || 0), 0)} />
        <Statistic title="Tests" value={testSummary.total || 0} />
        <Statistic title="Passed tests" value={testSummary.passed || 0} valueStyle={{ color: "#52c41a" }} />
        <Statistic title="Failed tests" value={testSummary.failed || 0} valueStyle={{ color: testSummary.failed ? "#ff4d4f" : undefined }} />
      </Space>
      <Alert style={{ marginTop: 16 }} showIcon type="info" message="Production routing contract" description="The quality center validates the actual tenant/platform/locale boundary and approved-content policy. It does not replace AI Source Router priority: hard rules, exact AI Q&A, Prompt & Image, approved FAQ/Knowledge, then Guide only when necessary." />
    </Card>
    <Tabs items={[{ key: "findings", label: <span><BugOutlined /> Findings</span>, children: <Card title="Duplicate, conflict, and image findings"><Table rowKey="id" size="small" loading={loading} dataSource={findings} columns={findingColumns as any} pagination={{ pageSize: 10 }} /></Card> }, { key: "tests", label: <span><CheckCircleOutlined /> Response tests</span>, children: <><Card title="Create a platform response test" style={{ marginBottom: 12 }}><Form form={form} layout="vertical"><Space style={{ display: "flex" }} align="start"><Form.Item name="name" label="Test name" rules={[{ required: true }]}><Input placeholder="Deposit not received" /></Form.Item><Form.Item name="locale" label="Locale" initialValue="en"><Input placeholder="en or id-ID" /></Form.Item><Form.Item name="expected_source_type" label="Expected source"><Select allowClear style={{ width: 210 }} options={Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))} /></Form.Item><Form.Item name="expected_image_mode" label="Image expectation" initialValue="any"><Select style={{ width: 150 }} options={[{ value: "any", label: "Any" }, { value: "required", label: "Required" }, { value: "none", label: "Must be none" }]} /></Form.Item></Space><Form.Item name="message" label="Customer message" rules={[{ required: true }]}><Input.TextArea rows={2} placeholder="My deposit has not arrived" /></Form.Item><Space style={{ display: "flex" }} align="start"><Form.Item name="expected_intent_key" label="Expected intent key"><Input placeholder="deposit_not_received" /></Form.Item><Form.Item name="required_facts" label="Required facts (comma-separated)"><Input placeholder="processing time, transaction ID" /></Form.Item><Form.Item name="forbidden_phrases" label="Forbidden phrases (comma-separated)"><Input placeholder="guaranteed, made-up status" /></Form.Item><Form.Item name="expected_image_roles" label="Expected image roles"><Input placeholder="deposit_step" /></Form.Item><Form.Item name="expected_image_ids" label="Expected image IDs/URLs"><Input placeholder="image_1" /></Form.Item></Space><Button type="primary" onClick={() => void createTest()}>Save test case</Button></Form></Card><Card title="Saved platform tests" extra={<Button onClick={() => void api.runAiQualitySuite().then((result: any) => { setLastRun(result.summary); void load(); }).catch((error: any) => message.error(error?.message || "Suite failed"))}>Run enabled suite</Button>}><Table rowKey="id" size="small" loading={loading} dataSource={testCases} columns={testColumns as any} pagination={{ pageSize: 8 }} /></Card>{lastRun ? <Alert style={{ marginTop: 12 }} showIcon type={lastRun.status === "pass" || lastRun.failed === 0 ? "success" : "warning"} message="Latest quality run" description={<pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(lastRun, null, 2)}</pre>} /> : null}</> }]} />
  </>;
}
