import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Alert, Button, Card, ColorPicker, Form, Input, Switch, Row, Col, message,
  Upload, Space, Tabs, Select, Tag,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/theme-settings")({ component: ThemeSettingsPage });

const VERSION = "v1.5.0";

function ThemeSettingsPage() {
  const [form] = Form.useForm();
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [buttons, setButtons] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.getSettings(), api.list("action-buttons")])
      .then(([settings, actionButtons]: any[]) => {
        setLoadError("");
        setButtons(Array.isArray(actionButtons) ? actionButtons : []);
        form.setFieldsValue({
          app_name: settings.app_name || "Luke Admin Control",
          logo_text: settings.logo_text || "AI",
          banner_title: settings.banner_title || "Help Center",
          banner_subtitle: settings.banner_subtitle || "Search FAQ and view approved guides.",
          support_link: settings.support_link || "",
          primary_color: settings.primary_color || "#f7c948",
          favicon_url: settings.favicon_url || "",
          chat_icon_url: settings.chat_icon_url || "",
          guide_logo_url: settings.guide_logo_url || "",
          chat_header_title: settings.chat_header_title || "AI Support",
          chat_online_text: settings.chat_online_text || "Online assistant",
          show_chat_support_button: settings.show_chat_support_button === true,
          show_guide_support_button: settings.show_guide_support_button === true,
          chat_welcome_title: settings.chat_welcome_title || "Welcome to Support",
          chat_welcome_subtitle: settings.chat_welcome_subtitle || "Please describe your issue and we will guide you step by step.",
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
          chat_start_button_ids: settings.chat_start_button_ids || [],
          chat_start_text_color: settings.chat_start_text_color || "#ffffff",
          chat_start_accent_color: settings.chat_start_accent_color || "#f7c948",
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
      for (const key of ["primary_color", "chat_start_text_color", "chat_start_accent_color"]) {
        if (values[key]?.toHexString) values[key] = values[key].toHexString();
      }
      const saved: any = await api.updateSettings(values);
      form.setFieldsValue(saved);
      message.success(`Theme and chat experience saved · ${VERSION}`);
    } catch (e: any) { message.error(e?.message || "Theme settings could not be saved"); }
    finally { setSaving(false); }
  };

  const uploadToField = async (file: File, field: string, label = "Image") => {
    try { const res = await api.upload(file); form.setFieldValue(field, res.url); message.success(`${label} uploaded`); }
    catch (e: any) { message.error(e?.message || "Upload failed"); }
    return false;
  };
  const uploadInput = (field: string, label: string, placeholder: string) => <Input placeholder={placeholder} addonAfter={<Upload showUploadList={false} beforeUpload={(file) => uploadToField(file, field, label)}><Button size="small" icon={<UploadOutlined />}>Upload</Button></Upload>} />;

  const startPreview = <Form.Item noStyle shouldUpdate>{() => {
    const get = (key: string, fallback = "") => form.getFieldValue(key) || fallback;
    const background = get("chat_background_url");
    return <div style={{ borderRadius: 16, minHeight: 410, padding: 18, color: get("chat_start_text_color", "#ffffff"), background: background ? `linear-gradient(#07111ddd,#07111ddd),url(${background}) center/cover` : "#101a2a", overflow: "hidden" }}>
      <style>{"@keyframes bdg-marquee { from { transform: translateX(100%); } to { transform: translateX(-100%); } }"}</style>
      {get("chat_start_announcement") && <div style={{ whiteSpace: "nowrap", overflow: "hidden", background: get("chat_start_accent_color", "#f7c948"), color: "#111827", padding: "7px 0", margin: "-18px -18px 16px", fontWeight: 700 }}><span style={{ display: "inline-block", animation: "bdg-marquee 12s linear infinite" }}>{get("chat_start_announcement")}</span></div>}
      <Tag color="blue">{get("chat_start_animation", "fade")} preview</Tag>
      <h3 style={{ color: "inherit", marginTop: 18 }}>{get("chat_start_title", "Welcome to Support")}</h3>
      <p style={{ color: "inherit", whiteSpace: "pre-wrap" }}>{get("chat_start_body", "Choose a quick topic or start a conversation.")}</p>
      {get("chat_start_image_url") && <img src={get("chat_start_image_url")} alt="Start screen" style={{ width: "100%", maxHeight: 145, objectFit: "cover", borderRadius: 10 }} />}
      {get("chat_start_maintenance_banner") && <Alert banner type="warning" message={get("chat_start_maintenance_banner")} style={{ marginTop: 12 }} />}
      {get("chat_start_responsible_notice") && <div style={{ marginTop: 12, fontSize: 12, opacity: .8 }}>{get("chat_start_responsible_notice")}</div>}
      <Button type="primary" style={{ marginTop: 18, background: get("chat_start_accent_color", "#f7c948"), color: "#111827", border: 0 }}>{get("chat_start_button_label", "Start chat")}</Button>
      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>{(get("chat_start_button_ids", []) || []).map((id: number) => { const button = buttons.find((item) => Number(item.id) === Number(id)); return button ? <Button key={id} size="small">{button.label || button.title || "Quick action"}</Button> : null; })}</div>
    </div>;
  }}</Form.Item>;

  return <Row gutter={[12, 12]}>
    <Col xs={24} lg={16}><Card className="bdg-card" title="Theme Settings & Chat Experience" size="small">
      {loadError && <Alert showIcon type="error" message="Theme settings unavailable" description={loadError} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical">
        <Tabs items={[
          { key: "brand", label: "Global Brand", children: <>
            <Alert type="info" showIcon message="Luke Admin Control · AI" description="Platform-owned values are isolated by the current /p/<route>/admin context." style={{ marginBottom: 16 }} />
            <Form.Item label="App name" name="app_name"><Input /></Form.Item>
            <Form.Item label="Logo text" name="logo_text"><Input /></Form.Item>
            <Form.Item label="Banner title" name="banner_title"><Input /></Form.Item>
            <Form.Item label="Banner subtitle" name="banner_subtitle"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item label="Support link" name="support_link"><Input /></Form.Item>
            <Row gutter={12}><Col span={12}><Form.Item label="Show Support button on Chat" name="show_chat_support_button" valuePropName="checked"><Switch /></Form.Item></Col><Col span={12}><Form.Item label="Show Support button on Guide" name="show_guide_support_button" valuePropName="checked"><Switch /></Form.Item></Col></Row>
            <Form.Item label="Primary color" name="primary_color"><ColorPicker showText format="hex" /></Form.Item>
            <Form.Item label="Guide logo URL" name="guide_logo_url">{uploadInput("guide_logo_url", "Guide logo", "https://.../logo.png")}</Form.Item>
            <Form.Item label="Favicon URL" name="favicon_url">{uploadInput("favicon_url", "Favicon", "https://.../favicon.ico")}</Form.Item>
          </> },
          { key: "chat", label: "Chat Theme", children: <>
            <Form.Item label="Chat header title" name="chat_header_title"><Input placeholder="AI Support" /></Form.Item>
            <Form.Item label="Chat online status text" name="chat_online_text"><Input placeholder="Online assistant" /></Form.Item>
            <Form.Item label="Welcome title" name="chat_welcome_title"><Input /></Form.Item>
            <Form.Item label="Welcome message" name="chat_welcome_subtitle"><Input.TextArea rows={3} /></Form.Item>
            <Form.Item label="Input placeholder" name="chat_input_placeholder"><Input /></Form.Item>
            <Form.Item label="Chat icon URL" name="chat_icon_url">{uploadInput("chat_icon_url", "Chat icon", "https://.../icon.png")}</Form.Item>
            <Row gutter={12}><Col span={8}><Form.Item label="Layout" name="chat_layout"><Select options={[{ value: "standard", label: "Standard" }, { value: "compact", label: "Compact" }, { value: "centered", label: "Centered" }]} /></Form.Item></Col><Col span={8}><Form.Item label="Bubble style" name="chat_bubble_style"><Select options={[{ value: "soft", label: "Soft" }, { value: "sharp", label: "Sharp" }, { value: "minimal", label: "Minimal" }]} /></Form.Item></Col><Col span={8}><Form.Item label="Input style" name="chat_input_style"><Select options={[{ value: "rounded", label: "Rounded" }, { value: "square", label: "Square" }, { value: "minimal", label: "Minimal" }]} /></Form.Item></Col></Row>
          </> },
          { key: "start", label: "Chat Start Module · Chat Start Studio", children: <>
            <Alert type="info" showIcon message="Preview before publishing" description="Configure the complete start screen for this platform. Announcements move on the preview, images can be uploaded from local storage, and only safe animation presets are allowed." style={{ marginBottom: 16 }} />
            <Form.Item label="Enable start screen" name="chat_start_enabled" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item label="Start screen title" name="chat_start_title"><Input placeholder="Welcome to Support" /></Form.Item>
            <Form.Item label="Start screen message" name="chat_start_body"><Input.TextArea rows={4} placeholder="Choose a quick topic or start a conversation." /></Form.Item>
            <Form.Item label="Start screen image URL" name="chat_start_image_url">{uploadInput("chat_start_image_url", "Start image", "https://.../welcome.png")}</Form.Item>
            <Form.Item label="Chat background" name="chat_background_url">{uploadInput("chat_background_url", "Chat background", "https://.../background.jpg")}</Form.Item>
            <Row gutter={12}><Col span={12}><Form.Item label="Animation preset" name="chat_start_animation"><Select options={["none", "fade", "slide", "pulse", "typing"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} /></Form.Item></Col><Col span={12}><Form.Item label="Start button label" name="chat_start_button_label"><Input placeholder="Start chat" /></Form.Item></Col></Row>
            <Form.Item label="Announcement (moving)" name="chat_start_announcement"><Input.TextArea rows={2} placeholder="Optional announcement" /></Form.Item>
            <Form.Item label="Maintenance banner" name="chat_start_maintenance_banner"><Input.TextArea rows={2} placeholder="Optional maintenance notice" /></Form.Item>
            <Form.Item label="Responsible-support notice" name="chat_start_responsible_notice"><Input.TextArea rows={2} placeholder="Optional responsible-support notice" /></Form.Item>
            <Row gutter={12}><Col span={12}><Form.Item label="Message text color" name="chat_start_text_color"><ColorPicker showText format="hex" /></Form.Item></Col><Col span={12}><Form.Item label="Accent / button color" name="chat_start_accent_color"><ColorPicker showText format="hex" /></Form.Item></Col></Row>
            <Form.Item label="Custom ticket / quick-action buttons" name="chat_start_button_ids" extra="Only buttons configured for this platform appear in the preview"><Select mode="multiple" options={buttons.map((button) => ({ value: Number(button.id), label: button.label || button.title || `Button ${button.id}` }))} placeholder="Choose platform buttons" /></Form.Item>
          </> },
        ]} />
        <Space><Button type="primary" loading={saving} onClick={save}>Save changes</Button><Upload showUploadList={false} beforeUpload={(file) => uploadToField(file, "favicon_url", "Favicon")}><Button icon={<UploadOutlined />}>Upload favicon</Button></Upload></Space>
      </Form>
    </Card></Col>
    <Col xs={24} lg={8}><Card className="bdg-card" title="Live chat start preview" size="small">{startPreview}</Card></Col>
  </Row>;
}
