import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Switch, Tag, message } from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import LocalizedHelp from "@/components/LocalizedHelp";

export const Route = createFileRoute("/_admin/ai-reliability")({ component: AiReliabilityPage });

function AiReliabilityPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<any>(null);
  const load = async () => { setLoading(true); try { const value = await api.getAiReliability(); form.setFieldsValue(value.settings || value); } catch (error: any) { message.error(error?.message || "Could not load AI reliability policy"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const save = async () => { setSaving(true); try { await api.updateAiReliability(await form.validateFields()); message.success("AI reliability policy saved"); } catch (error: any) { message.error(error?.message || "Could not save policy"); } finally { setSaving(false); } };
  const runTest = async () => { try { setTest(await api.testAiReliability({ message: "I cannot find my answer" })); } catch (error: any) { message.error(error?.message || "Reliability test failed"); } };
  return <>
    <LocalizedHelp copies={{
      en: { title: "AI reliability foundation", body: "This policy controls what happens when the provider times out, an answer is uncertain, or no approved source matches. It is scoped to the current tenant and platform. The AI never invents a status; it gives a neutral reply, records a request ID, and can hand the member to support.", bullets: ["Clarification threshold: below this confidence, ask one useful follow-up question.", "Retries are bounded and provider errors never expose secrets.", "Unknown and provider-error replies are editable per platform."] },
      zh: { title: "AI 可靠性基础", body: "此策略控制供应商超时、答案不确定或没有已批准来源匹配时的处理方式。策略只作用于当前租户和平台。AI 不会编造状态，而是发送中性回复、记录请求 ID，并可将用户转交支持团队。", bullets: ["澄清阈值：信心低于该值时，先提出一个有用的追问。", "重试次数受限，供应商错误不会暴露密钥。", "每个平台都可以编辑未知问题和供应商错误提示。"] },
      my: { title: "AI ယုံကြည်စိတ်ချရမှု အခြေခံ", body: "ဤမူဝါဒသည် provider timeout ဖြစ်ခြင်း၊ အဖြေမသေချာခြင်း သို့မဟုတ် အတည်ပြုထားသော source မကိုက်ညီခြင်းကို ထိန်းချုပ်သည်။ လက်ရှိ tenant နှင့် platform အတွက်သာ သက်ရောက်ပြီး AI သည် status ကို မဖန်တီးပါ။ Neutral reply ပေးခြင်း၊ request ID မှတ်တမ်းတင်ခြင်းနှင့် support သို့ လွှဲပြောင်းခြင်းကို အသုံးပြုသည်။", bullets: ["Clarification threshold အောက်ရောက်ပါက အသုံးဝင်သော follow-up မေးခွန်းတစ်ခု မေးမည်။", "Retry အရေအတွက်ကို ကန့်သတ်ထားပြီး provider error တွင် secret မပါဝင်ပါ။", "Unknown နှင့် provider-error reply များကို platform တစ်ခုချင်းစီအလိုက် ပြင်နိုင်သည်။"] },
    }} />
    <Card loading={loading} title={<Space><SafetyCertificateOutlined />AI Reliability Policy</Space>} extra={<Space><Button onClick={() => void runTest()}>Run safety test</Button><Button type="primary" loading={saving} onClick={() => void save()}>Save policy</Button></Space>}>
      <Form form={form} layout="vertical"><Space style={{ display: "flex" }} align="start"><Form.Item name="enabled" label="Reliability policy enabled" valuePropName="checked"><Switch /></Form.Item><Form.Item name="clarification_threshold" label="Clarification threshold"><InputNumber min={1} max={100} /></Form.Item><Form.Item name="escalation_threshold" label="Escalation threshold"><InputNumber min={1} max={100} /></Form.Item><Form.Item name="max_retries" label="Maximum retries"><InputNumber min={0} max={5} /></Form.Item><Form.Item name="provider_timeout_ms" label="Provider timeout (ms)"><InputNumber min={3000} max={30000} step={1000} /></Form.Item></Space><Form.Item name="fallback_mode" label="Fallback mode"><Select options={[{ value: "clarify_then_human", label: "Clarify, then offer human support" }, { value: "clarify_only", label: "Clarify only" }, { value: "human_only", label: "Offer human support" }]} /></Form.Item><Form.Item name="handoff_url" label="Support handoff URL"><Input placeholder="https://support.example.com" /></Form.Item><Form.Item name="unknown_reply" label="Unknown-question reply"><Input.TextArea rows={3} /></Form.Item><Form.Item name="provider_error_reply" label="Provider-error reply"><Input.TextArea rows={3} /></Form.Item></Form>
      {test ? <Alert showIcon type={test.checks?.every((item: any) => item.ok) ? "success" : "warning"} message="Reliability test result" description={<Space wrap>{(test.checks || []).map((item: any) => <Tag key={item.name} color={item.ok ? "green" : "red"}>{item.name}: {item.ok ? "pass" : "check"}</Tag>)}</Space>} style={{ marginTop: 8 }} /> : null}
    </Card>
  </>;
}
