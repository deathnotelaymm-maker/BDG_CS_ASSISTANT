import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Card,
  ColorPicker,
  Form,
  Input,
  Switch,
  Button,
  Row,
  Col,
  message,
  Upload,
  Space,
  Tabs,
  Select,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/theme-settings")({
  component: ThemeSettingsPage,
});

function ThemeSettingsPage() {
  const [form] = Form.useForm();
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((settings: any) => {
        setLoadError("");
        form.setFieldsValue({
          app_name: settings.app_name || "BDG Help Center",
          logo_text: settings.logo_text || "BDG",
          banner_title: settings.banner_title || "BDG Mobile Help Center",
          banner_subtitle: settings.banner_subtitle || "Search FAQ and view official guide images.",
          support_link: settings.support_link || "",
          primary_color: settings.primary_color || "#f7c948",
          favicon_url: settings.favicon_url || "",
          chat_icon_url: settings.chat_icon_url || "",
          guide_logo_url: settings.guide_logo_url || "",
          chat_header_title: settings.chat_header_title || "BDG AI Support",
          chat_online_text: settings.chat_online_text || "Online assistant",
          show_chat_support_button: settings.show_chat_support_button === true,
          show_guide_support_button: settings.show_guide_support_button === true,
          chat_welcome_title: settings.chat_welcome_title || "Welcome to BDG AI Support",
          chat_welcome_subtitle:
            settings.chat_welcome_subtitle ||
            "Please describe your issue and we will guide you step by step.",
          chat_input_placeholder: settings.chat_input_placeholder || "Type your message...",
          chat_start_enabled: settings.chat_start_enabled !== false,
          chat_start_title: settings.chat_start_title || "Welcome to Support",
          chat_start_body: settings.chat_start_body || "Choose a quick topic or start a conversation.",
          chat_start_image_url: settings.chat_start_image_url || "",
          chat_start_animation: settings.chat_start_animation || "fade",
          chat_start_button_label: settings.chat_start_button_label || "Start chat",
          chat_start_announcement: settings.chat_start_announcement || "",
          chat_start_maintenance_banner: settings.chat_start_maintenance_banner || "",
          chat_start_responsible_notice: settings.chat_start_responsible_notice || "",
          chat_layout: settings.chat_layout || "standard",
          chat_bubble_style: settings.chat_bubble_style || "soft",
          chat_input_style: settings.chat_input_style || "rounded",
          chat_background_url: settings.chat_background_url || "",
        });
      })
      .catch((e: any) => setLoadError(e?.message || "Theme settings could not be loaded"));
  }, [form]);

  const save = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      if (values.primary_color?.toHexString)
        values.primary_color = values.primary_color.toHexString();
      const saved: any = await api.updateSettings(values);
      form.setFieldsValue(saved);
      message.success("Theme settings saved and published");
    } catch (e: any) {
      message.error(e?.message || "Theme settings could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const uploadToField = async (file: File, field: string, label = "Image") => {
    try {
      const res = await api.upload(file);
      form.setFieldValue(field, res.url);
      message.success(`${label} uploaded`);
    } catch (e: any) {
      message.error(e?.message || "Upload failed");
    }
    return false;
  };
  const uploadFavicon = (file: File) => uploadToField(file, "favicon_url", "Favicon");

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={16}>
        <Card className="bdg-card" title="Brand & Theme" size="small">
          {loadError && (
            <Alert
              showIcon
              type="error"
              message="Theme settings unavailable"
              description={loadError}
              style={{ marginBottom: 16 }}
            />
          )}
          <Form form={form} layout="vertical">
            <Tabs
              items={[
                {
                  key: "brand",
                  label: "Global Brand",
                  children: (
                    <>
                      <Form.Item label="App name" name="app_name">
                        <Input />
                      </Form.Item>
                      <Form.Item label="Logo text" name="logo_text">
                        <Input />
                      </Form.Item>
                      <Form.Item label="Banner title" name="banner_title">
                        <Input />
                      </Form.Item>
                      <Form.Item label="Banner subtitle" name="banner_subtitle">
                        <Input.TextArea rows={2} />
                      </Form.Item>
                      <Form.Item label="Support link" name="support_link">
                        <Input />
                      </Form.Item>
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item
                            label="Show Support button on Chat"
                            name="show_chat_support_button"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Show Support button on Guide"
                            name="show_guide_support_button"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        label="Primary color"
                        name="primary_color"
                        rules={[{ required: true }]}
                      >
                        <ColorPicker showText format="hex" />
                      </Form.Item>
                      <Form.Item label="Guide logo URL" name="guide_logo_url">
                        <Input
                          addonAfter={
                            <Upload
                              showUploadList={false}
                              beforeUpload={(f) => uploadToField(f, "guide_logo_url", "Guide logo")}
                            >
                              <Button size="small" icon={<UploadOutlined />}>
                                Upload
                              </Button>
                            </Upload>
                          }
                        />
                      </Form.Item>
                      <Form.Item
                        label="Favicon URL"
                        name="favicon_url"
                        rules={[{ type: "url", warningOnly: true }]}
                      >
                        <Input
                          placeholder="https://.../favicon.ico"
                          addonAfter={
                            <Upload showUploadList={false} beforeUpload={uploadFavicon}>
                              <Button size="small" icon={<UploadOutlined />}>
                                Upload
                              </Button>
                            </Upload>
                          }
                        />
                      </Form.Item>
                    </>
                  ),
                },
                {
                  key: "chat",
                  label: "Chat Experience",
                  children: (
                    <>
                      <Form.Item label="Chat header title" name="chat_header_title">
                        <Input placeholder="BDG AI Support" />
                      </Form.Item>
                      <Form.Item label="Chat online status text" name="chat_online_text">
                        <Input placeholder="Online assistant" />
                      </Form.Item>
                      <Form.Item label="Welcome title" name="chat_welcome_title">
                        <Input />
                      </Form.Item>
                      <Form.Item label="Welcome message" name="chat_welcome_subtitle">
                        <Input.TextArea rows={3} />
                      </Form.Item>
                      <Form.Item label="Input placeholder" name="chat_input_placeholder">
                        <Input />
                      </Form.Item>
                      <Form.Item label="Chat icon URL" name="chat_icon_url">
                        <Input
                          addonAfter={
                            <Upload
                              showUploadList={false}
                              beforeUpload={(f) => uploadToField(f, "chat_icon_url", "Chat icon")}
                            >
                              <Button size="small" icon={<UploadOutlined />}>
                                Upload
                              </Button>
                            </Upload>
                          }
                        />
                      </Form.Item>
                      <Alert
                        type="info"
                        showIcon
                        message="Chat Start Module"
                        description="This screen appears before the first message for this platform only. Use safe animation presets and keep customer-facing notices short."
                        style={{ margin: "12px 0 16px" }}
                      />
                      <Form.Item
                        label="Enable start screen"
                        name="chat_start_enabled"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                      <Form.Item label="Start screen title" name="chat_start_title">
                        <Input placeholder="Welcome to Support" />
                      </Form.Item>
                      <Form.Item label="Start screen message" name="chat_start_body">
                        <Input.TextArea rows={4} placeholder="Choose a quick topic or start a conversation." />
                      </Form.Item>
                      <Form.Item label="Start screen image URL" name="chat_start_image_url">
                        <Input
                          placeholder="https://.../welcome.png"
                          addonAfter={
                            <Upload
                              showUploadList={false}
                              beforeUpload={(f) => uploadToField(f, "chat_start_image_url", "Start image")}
                            >
                              <Button size="small" icon={<UploadOutlined />}>Upload</Button>
                            </Upload>
                          }
                        />
                      </Form.Item>
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item label="Animation preset" name="chat_start_animation">
                            <Select options={[
                              { value: "none", label: "None" },
                              { value: "fade", label: "Fade" },
                              { value: "slide", label: "Slide" },
                              { value: "pulse", label: "Pulse" },
                              { value: "typing", label: "Typing" },
                            ]} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Start button label" name="chat_start_button_label">
                            <Input placeholder="Start chat" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item label="Announcement" name="chat_start_announcement">
                        <Input.TextArea rows={2} placeholder="Optional announcement" />
                      </Form.Item>
                      <Form.Item label="Maintenance banner" name="chat_start_maintenance_banner">
                        <Input.TextArea rows={2} placeholder="Optional maintenance notice" />
                      </Form.Item>
                      <Form.Item label="Responsible-support notice" name="chat_start_responsible_notice">
                        <Input.TextArea rows={2} placeholder="Optional responsible-support notice" />
                      </Form.Item>
                      <Row gutter={12}>
                        <Col span={8}>
                          <Form.Item label="Layout" name="chat_layout">
                            <Select options={[
                              { value: "standard", label: "Standard" },
                              { value: "compact", label: "Compact" },
                              { value: "centered", label: "Centered" },
                            ]} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item label="Bubble style" name="chat_bubble_style">
                            <Select options={[
                              { value: "soft", label: "Soft" },
                              { value: "sharp", label: "Sharp" },
                              { value: "minimal", label: "Minimal" },
                            ]} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item label="Input style" name="chat_input_style">
                            <Select options={[
                              { value: "rounded", label: "Rounded" },
                              { value: "square", label: "Square" },
                              { value: "minimal", label: "Minimal" },
                            ]} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item label="Chat background URL" name="chat_background_url">
                        <Input placeholder="https://.../background.jpg" />
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
            <Space>
              <Button type="primary" loading={saving} onClick={save}>
                Save changes
              </Button>
              <Upload showUploadList={false} beforeUpload={uploadFavicon}>
                <Button icon={<UploadOutlined />}>Upload favicon</Button>
              </Upload>
            </Space>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card className="bdg-card" title="Preview" size="small">
          <Form.Item noStyle shouldUpdate>
            {() => (
              <div
                style={{
                  padding: 20,
                  background: "var(--navy-700)",
                  borderRadius: 8,
                  border: "1px solid var(--border-dim)",
                }}
              >
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>
                  {form.getFieldValue("app_name") || "BDG Help Center"}
                </div>
                <div style={{ color: "#8ea0bd", fontSize: 12, marginTop: 4 }}>
                  Business Admin Console
                </div>
                {form.getFieldValue("chat_icon_url") && (
                  <img
                    src={form.getFieldValue("chat_icon_url")}
                    alt="chat icon"
                    style={{ width: 48, height: 48, marginTop: 16, borderRadius: 999 }}
                  />
                )}
                <Button type="primary" style={{ marginTop: 16, display: "block" }}>
                  Primary action
                </Button>
              </div>
            )}
          </Form.Item>
        </Card>
      </Col>
    </Row>
  );
}
