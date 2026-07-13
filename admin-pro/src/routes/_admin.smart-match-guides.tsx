import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Upload,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Alert,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  ThunderboltOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/smart-match-guides")({
  component: SmartMatchAttachmentPage,
});

type RowType = {
  id: number;
  name: string;
  slug: string;
  status: string;
  priority: number;
  keywords: string;
  typo_keywords: string;
  language_keywords: string;
  guide_text: string;
  guide_text_hi: string;
  image_urls: string[];
  image_urls_hi?: string[];
  fallback_to_english_images?: boolean;
  ai_enabled: boolean;
  ai_enhance: boolean;
  strict_mode: boolean;
  confidence_threshold: number;
  negative_keywords?: string;
  require_confirmation?: boolean;
  clarify_question?: string;
  answer_blocks_json?: string;
  icon_url?: string;
  action_label?: string;
  action_url?: string;
  intent_id?: string;
  positive_examples?: string;
  negative_examples?: string;
  common_misspellings?: string;
  required_fields?: string;
  excluded_situations?: string;
  risk_level?: string;
  human_escalation_required?: boolean;
  allowed_response_content?: string;
  forbidden_claims?: string;
  required_warning?: string;
  intent_policy_json?: string;
  max_clarification_questions?: number;
  clarification_questions_json?: string;
  response_layout_json?: string;
  attach_mode?: string;
  when_to_attach?: string;
  when_not_to_attach?: string;
  guide_usage_policy?: string;
  knowledge_version?: string;
};

type RichBlockForm = {
  type: string;
  text?: string;
  title?: string;
  label?: string;
  url?: string;
  items_text?: string;
  level?: number;
};

function richBlocksForForm(value?: string): RichBlockForm[] {
  try {
    const blocks = JSON.parse(value || "[]");
    if (!Array.isArray(blocks)) return [];
    return blocks.map((block: any) => ({
      ...block,
      type: block.type === "button" ? "link" : block.type || "paragraph",
      label: block.label || block.text || "",
      items_text: Array.isArray(block.items) ? block.items.join("\n") : "",
    }));
  } catch {
    return [];
  }
}

function richBlocksForApi(blocks: RichBlockForm[] = []) {
  return blocks.map((block) => {
    if (block.type === "divider") return { type: "divider" };
    if (block.type === "steps") {
      return {
        type: "steps",
        title: String(block.title || "").trim(),
        items: String(block.items_text || "")
          .split(/\r?\n/)
          .map((x) => x.trim())
          .filter(Boolean),
      };
    }
    if (block.type === "link") {
      return {
        type: "link",
        label: String(block.label || "").trim(),
        url: String(block.url || "").trim(),
      };
    }
    if (block.type === "heading") {
      return {
        type: "heading",
        text: String(block.text || "").trim(),
        level: block.level === 3 ? 3 : 2,
      };
    }
    return { type: block.type || "paragraph", text: String(block.text || "").trim() };
  });
}

function SmartMatchAttachmentPage() {
  const [rows, setRows] = useState<RowType[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RowType | null>(null);
  const [testMessage, setTestMessage] = useState("depoist not recive");
  const [testResult, setTestResult] = useState<any>(null);
  const [form] = Form.useForm();
  const watchedResponseBlocks = Form.useWatch("response_blocks", form) || [];

  const load = async () => {
    setLoading(true);
    try {
      setRows((await api.list("smart-match-guides")) as RowType[]);
    } catch (e: any) {
      message.error(e?.message || "Failed to load Guide Attachments");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      status: "active",
      priority: 100,
      ai_enabled: true,
      ai_enhance: true,
      strict_mode: true,
      confidence_threshold: 90,
      attach_mode: "auto_when_clear",
      response_blocks: [],
    });
    setOpen(true);
  };
  const openEdit = (row: RowType) => {
    setEditing(row);
    form.setFieldsValue({
      ...row,
      image_urls: Array.isArray(row.image_urls) ? row.image_urls.join("\n") : row.image_urls,
      image_urls_hi: Array.isArray(row.image_urls_hi)
        ? row.image_urls_hi.join("\n")
        : row.image_urls_hi,
      response_blocks: richBlocksForForm(row.answer_blocks_json),
    });
    setOpen(true);
  };
  const save = async () => {
    const values = await form.validateFields();
    const responseBlocks = richBlocksForApi(values.response_blocks || []);
    const payload = {
      ...values,
      answer_blocks_json: JSON.stringify(responseBlocks),
      image_urls: String(values.image_urls || "")
        .split(/\r?\n|,/)
        .map((x) => x.trim())
        .filter(Boolean),
      image_urls_hi: String(values.image_urls_hi || "")
        .split(/\r?\n|,/)
        .map((x) => x.trim())
        .filter(Boolean),
    };
    delete payload.response_blocks;
    try {
      if (editing) await api.update("smart-match-guides", editing.id, payload);
      else await api.create("smart-match-guides", payload);
      message.success(editing ? "Guide Attachment updated" : "Guide Attachment created");
      setOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "Save failed");
    }
  };
  const uploadImage = async (file: File, field = "image_urls") => {
    try {
      const res = await api.upload(file);
      const current = form.getFieldValue(field) || "";
      form.setFieldValue(field, `${current}${current ? "\n" : ""}${res.url}`);
      message.success("Image uploaded and added");
    } catch (e: any) {
      message.error(e?.message || "Upload failed");
    }
    return false;
  };
  const runTest = async () => {
    try {
      setTestResult(await api.testSmartMatch(testMessage, "en"));
    } catch (e: any) {
      message.error(e?.message || "Test failed");
    }
  };

  const columns: ColumnsType<RowType> = [
    {
      title: "Attachment",
      dataIndex: "name",
      render: (_, r) => (
        <div>
          <b>{r.name}</b>
          <div style={{ color: "#8ea0bd", fontSize: 12 }}>{r.slug}</div>
        </div>
      ),
    },
    {
      title: "Intent / Risk",
      width: 180,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">{r.intent_id || r.slug}</Tag>
          <Tag
            color={
              r.risk_level === "restricted"
                ? "red"
                : r.risk_level === "sensitive"
                  ? "orange"
                  : "green"
            }
          >
            {r.risk_level || "normal"}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Keywords",
      dataIndex: "keywords",
      responsive: ["lg"],
      render: (v) => <span style={{ color: "#8ea0bd" }}>{String(v || "").slice(0, 90)}</span>,
    },
    {
      title: "Confidence",
      width: 170,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Tag color="gold">Direct ≥ {r.confidence_threshold || 90}%</Tag>
          <Tag color={r.require_confirmation ? "orange" : "green"}>
            {r.require_confirmation ? "Confirm first" : "Auto if high"}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Attach Mode",
      width: 160,
      render: (_, r) => (
        <Tag
          color={
            r.attach_mode === "never"
              ? "default"
              : r.attach_mode === "ask_first"
                ? "orange"
                : "green"
          }
        >
          {r.attach_mode || "auto_when_clear"}
        </Tag>
      ),
    },
    {
      title: "AI",
      width: 120,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Tag color={r.ai_enabled ? "blue" : "default"}>Detect {r.ai_enabled ? "ON" : "OFF"}</Tag>
          <Tag color={r.ai_enhance ? "purple" : "default"}>
            Enhance {r.ai_enhance ? "ON" : "OFF"}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (v) => <Tag color={v === "active" ? "success" : "default"}>{v}</Tag>,
    },
    { title: "Priority", dataIndex: "priority", width: 90 },
    {
      title: "Actions",
      width: 165,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this Guide Attachment?"
            onConfirm={() => api.remove("smart-match-guides", row.id).then(load)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="bdg-filters">
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>Prompt-First AI + Optional Guide Delivery</h2>
          <div style={{ color: "#8ea0bd", fontSize: 12 }}>
            AI Prompt Manager is the brain. Guide Attachments are optional support images/text sent
            only when clearly useful.
          </div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Create Attachment
          </Button>
        </Space>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} lg={15}>
          <Alert
            showIcon
            type="info"
            message="Chat now uses Prompt-First AI"
            description="The AI answers from AI Prompt Manager first. Guide images are optional attachments after the answer. Use attach modes and when-to-attach rules to control image delivery."
          />
        </Col>
        <Col xs={24} lg={9}>
          <Card className="bdg-card" size="small" title="AI Test Lab">
            <Space.Compact style={{ width: "100%" }}>
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="depoist not recive"
              />
              <Button type="primary" icon={<ThunderboltOutlined />} onClick={runTest}>
                Test
              </Button>
            </Space.Compact>
            {testResult && (
              <pre
                style={{
                  marginTop: 12,
                  whiteSpace: "pre-wrap",
                  maxHeight: 220,
                  overflow: "auto",
                  color: "#cbd5e1",
                }}
              >
                {JSON.stringify(testResult, null, 2)}
              </pre>
            )}
          </Card>
        </Col>
      </Row>

      <Table
        className="bdg-table"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 10 }}
      />

      <Drawer
        title={editing ? "Edit Guide Attachment" : "Create Guide Attachment"}
        open={open}
        onClose={() => setOpen(false)}
        width={820}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={save}>
              Save
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" form={form}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="Guide Attachment Topic Name"
                rules={[{ required: true }]}
              >
                <Input placeholder="Deposit Not Received" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="slug" label="Slug">
                <Input placeholder="deposit-not-received" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="intent_id" label="Intent ID">
                <Input placeholder="deposit_not_received" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="risk_level" label="Risk Level">
                <Select
                  options={["normal", "sensitive", "restricted"].map((x) => ({
                    value: x,
                    label: x,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="knowledge_version" label="Knowledge Version">
                <Input placeholder="v1" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="attach_mode" label="Guide Attach Mode">
                <Select
                  options={[
                    { value: "never", label: "Never auto-send" },
                    { value: "ask_first", label: "Ask before sending" },
                    { value: "auto_when_clear", label: "Auto-send when clearly useful" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="guide_usage_policy" label="Guide Usage Policy">
                <Input placeholder="AI prompt answers first; attach this only after the answer when useful." />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="when_to_attach" label="When to attach this guide image">
            <Input.TextArea
              rows={2}
              placeholder="Attach after the AI answer when the user clearly needs visual steps for this topic."
            />
          </Form.Item>
          <Form.Item name="when_not_to_attach" label="When NOT to attach">
            <Input.TextArea
              rows={2}
              placeholder="Do not attach for unclear questions, rejected issues, already solved cases, or similar but different topics."
            />
          </Form.Item>
          <Form.Item name="keywords" label="Intent examples / keywords">
            <Input.TextArea
              rows={3}
              placeholder="deposit not received, recharge not received, payment not added"
            />
          </Form.Item>
          <Form.Item name="positive_examples" label="Positive examples - should match this intent">
            <Input.TextArea
              rows={3}
              placeholder={
                "My deposit has not arrived\nRecharge still pending\nMoney deducted but balance not added"
              }
            />
          </Form.Item>
          <Form.Item
            name="negative_examples"
            label="Negative examples - should NOT match this intent"
          >
            <Input.TextArea
              rows={3}
              placeholder={"Withdrawal not received\nHow do I deposit?\nDeposit account disabled"}
            />
          </Form.Item>
          <Form.Item name="typo_keywords" label="Wrong spelling / typo keywords">
            <Input.TextArea rows={2} placeholder="depoist not recive, deposite not receive" />
          </Form.Item>
          <Form.Item name="language_keywords" label="Other language keywords">
            <Input.TextArea rows={2} placeholder="Hindi, Burmese, Chinese, English keywords" />
          </Form.Item>
          <Form.Item
            name="negative_keywords"
            label="Negative keywords - do NOT match when these appear"
          >
            <Input.TextArea
              rows={3}
              placeholder="account number, account id, mobile number, game account, already arrived, not this issue"
            />
          </Form.Item>
          <Form.Item name="required_fields" label="Required information / fields">
            <Input.TextArea rows={2} placeholder={"deposit method\nwaiting time\nmoney deducted"} />
          </Form.Item>
          <Form.Item name="excluded_situations" label="Excluded situations">
            <Input.TextArea rows={2} placeholder={"payment rejected\nwrong recipient account"} />
          </Form.Item>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="Conversation State AI"
            description="If the customer says no / not this / already solved, the current guide is cancelled and the bot asks what issue they need now. Use negative keywords to prevent wrong matches."
          />
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="require_confirmation"
                label="Require confirmation before sending guide"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="human_escalation_required"
                label="Human escalation required"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="clarify_question" label="Clarification question">
            <Input.TextArea
              rows={2}
              placeholder="Do you want to delete/rebind your withdrawal bank account?"
            />
          </Form.Item>
          <Form.Item
            name="allowed_response_content"
            label="Allowed response content / escalation reply"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="forbidden_claims" label="Forbidden claims">
            <Input.TextArea
              rows={2}
              placeholder="Never promise manual balance adjustment. Never ask for OTP."
            />
          </Form.Item>
          <Form.Item name="required_warning" label="Required warning">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="guide_text"
            label="Optional support text - English"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={5} />
          </Form.Item>
          <Card
            className="bdg-card"
            size="small"
            title="Structured Rich Response"
            style={{ marginBottom: 16 }}
          >
            <Alert
              showIcon
              type="info"
              message="Safe semantic colors"
              description="Choose Warning, Information, Success, or Error and Chat applies the approved color automatically. Raw HTML and arbitrary colors are not allowed."
              style={{ marginBottom: 12 }}
            />
            <Form.List name="response_blocks">
              {(fields, { add, remove }) => (
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  {fields.map((field, index) => {
                    const type = watchedResponseBlocks[field.name]?.type || "paragraph";
                    return (
                      <Card
                        key={field.key}
                        size="small"
                        title={
                          <Space>
                            <HolderOutlined />
                            <span>Block {index + 1}</span>
                          </Space>
                        }
                        extra={
                          <Button
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                          >
                            Remove
                          </Button>
                        }
                      >
                        <Row gutter={12}>
                          <Col span={8}>
                            <Form.Item
                              name={[field.name, "type"]}
                              label="Block type"
                              rules={[{ required: true }]}
                            >
                              <Select
                                options={[
                                  ["heading", "Heading"],
                                  ["paragraph", "Paragraph"],
                                  ["steps", "Numbered steps"],
                                  ["notice", "Information"],
                                  ["warning", "Warning"],
                                  ["success", "Success"],
                                  ["error", "Error"],
                                  ["link", "Action link"],
                                  ["divider", "Divider"],
                                ].map(([value, label]) => ({ value, label }))}
                              />
                            </Form.Item>
                          </Col>
                          {type === "heading" && (
                            <Col span={6}>
                              <Form.Item name={[field.name, "level"]} label="Heading size">
                                <Select
                                  options={[
                                    { value: 2, label: "Large" },
                                    { value: 3, label: "Small" },
                                  ]}
                                />
                              </Form.Item>
                            </Col>
                          )}
                        </Row>
                        {type === "steps" ? (
                          <>
                            <Form.Item name={[field.name, "title"]} label="Steps title">
                              <Input placeholder="What to do" />
                            </Form.Item>
                            <Form.Item
                              name={[field.name, "items_text"]}
                              label="Steps — one item per line"
                              rules={[{ required: true }]}
                            >
                              <Input.TextArea rows={4} />
                            </Form.Item>
                          </>
                        ) : type === "link" ? (
                          <Row gutter={12}>
                            <Col span={10}>
                              <Form.Item
                                name={[field.name, "label"]}
                                label="Button label"
                                rules={[{ required: true }]}
                              >
                                <Input placeholder="Open official guide" />
                              </Form.Item>
                            </Col>
                            <Col span={14}>
                              <Form.Item
                                name={[field.name, "url"]}
                                label="HTTPS URL"
                                rules={[{ required: true, type: "url" }]}
                              >
                                <Input placeholder="https://..." />
                              </Form.Item>
                            </Col>
                          </Row>
                        ) : type !== "divider" ? (
                          <Form.Item
                            name={[field.name, "text"]}
                            label="Text"
                            rules={[{ required: true }]}
                          >
                            <Input.TextArea rows={type === "paragraph" ? 3 : 2} />
                          </Form.Item>
                        ) : null}
                      </Card>
                    );
                  })}
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => add({ type: "paragraph", text: "" })}
                  >
                    Add response block
                  </Button>
                </Space>
              )}
            </Form.List>
          </Card>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="icon_url" label="Icon URL">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="action_label" label="Action label">
                <Input placeholder="Open full guide" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="action_url" label="Action URL">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="image_urls" label="English guide attachment images, one URL per line">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Upload showUploadList={false} beforeUpload={(f) => uploadImage(f, "image_urls")}>
            <Button icon={<UploadOutlined />}>Upload English image</Button>
          </Upload>
          <Form.Item name="guide_text_hi" label="Optional support text - Hindi">
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item
            name="image_urls_hi"
            label="Hindi / Indian guide attachment images, one URL per line"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Upload showUploadList={false} beforeUpload={(f) => uploadImage(f, "image_urls_hi")}>
            <Button icon={<UploadOutlined />}>Upload Hindi image</Button>
          </Upload>
          <Form.Item
            name="fallback_to_english_images"
            label="Fallback to English images if Hindi images are missing"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Row gutter={12} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Form.Item name="status" label="Status">
                <Select
                  options={["active", "disabled", "draft"].map((x) => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="priority" label="Priority">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="confidence_threshold" label="Direct-send threshold">
                <InputNumber style={{ width: "100%" }} min={60} max={99} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="max_clarification_questions" label="Max clarifications">
                <InputNumber style={{ width: "100%" }} min={1} max={2} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="clarification_questions_json"
            label="Clarification questions JSON by language"
          >
            <Input.TextArea
              rows={3}
              placeholder={
                '{"en":["Which deposit method did you use?"],"hi":["आपने कौन सा भुगतान तरीका इस्तेमाल किया?"]}'
              }
            />
          </Form.Item>
          <Form.Item name="response_layout_json" label="Response layout JSON">
            <Input.TextArea
              rows={3}
              placeholder={'["acknowledgement","direct_answer","steps","images","final_action"]'}
            />
          </Form.Item>
          <Form.Item name="intent_policy_json" label="Intent policy JSON">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item name="ai_enabled" label="AI intent detection" valuePropName="checked">
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
            <Form.Item name="ai_enhance" label="AI enhance reply" valuePropName="checked">
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
            <Form.Item name="strict_mode" label="Strict mode" valuePropName="checked">
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
          </Space>
        </Form>
      </Drawer>
    </>
  );
}
