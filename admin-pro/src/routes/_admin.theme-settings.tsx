import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Card, Form, Input, Switch, Button, Row, Col, message, Upload, Space } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/theme-settings")({
  component: ThemeSettingsPage,
});

function ThemeSettingsPage() {
  const [form] = Form.useForm();

  useEffect(() => {
    api.getSettings().then((settings: any) => {
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
        dark: true,
        show_chat_support_button: settings.show_chat_support_button === true,
        show_guide_support_button: settings.show_guide_support_button === true,
      });
    }).catch(() => {});
  }, [form]);

  const save = async () => {
    const values = await form.validateFields();
    await api.updateSettings(values);
    message.success("Theme settings saved");
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
          <Form form={form} layout="vertical">
            <Form.Item label="App name" name="app_name"><Input /></Form.Item>
            <Form.Item label="Logo text" name="logo_text"><Input /></Form.Item>
            <Form.Item label="Banner title" name="banner_title"><Input /></Form.Item>
            <Form.Item label="Banner subtitle" name="banner_subtitle"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item label="Support link" name="support_link"><Input /></Form.Item>
            <Row gutter={12}>
              <Col span={12}><Form.Item label="Show Support button on Chat" name="show_chat_support_button" valuePropName="checked"><Switch /></Form.Item></Col>
              <Col span={12}><Form.Item label="Show Support button on Guide" name="show_guide_support_button" valuePropName="checked"><Switch /></Form.Item></Col>
            </Row>
            <Form.Item label="Primary color" name="primary_color"><Input /></Form.Item>
            <Form.Item label="Chat header title" name="chat_header_title"><Input placeholder="BDG AI Support" /></Form.Item>
            <Form.Item label="Chat online status text" name="chat_online_text"><Input placeholder="Online assistant" /></Form.Item>
            <Form.Item label="Chat icon URL" name="chat_icon_url">
              <Input addonAfter={<Upload showUploadList={false} beforeUpload={(f) => uploadToField(f, "chat_icon_url", "Chat icon")}><Button size="small" icon={<UploadOutlined />}>Upload</Button></Upload>} />
            </Form.Item>
            <Form.Item label="Guide logo URL" name="guide_logo_url">
              <Input addonAfter={<Upload showUploadList={false} beforeUpload={(f) => uploadToField(f, "guide_logo_url", "Guide logo")}><Button size="small" icon={<UploadOutlined />}>Upload</Button></Upload>} />
            </Form.Item>
            <Form.Item label="Favicon URL" name="favicon_url">
              <Input
                placeholder="https://.../favicon.ico"
                addonAfter={<Upload showUploadList={false} beforeUpload={uploadFavicon}><Button size="small" icon={<UploadOutlined />}>Upload</Button></Upload>}
              />
            </Form.Item>
            <Form.Item label="Dark admin mode" name="dark" valuePropName="checked"><Switch /></Form.Item>
            <Space>
              <Button type="primary" onClick={save}>Save changes</Button>
              <Upload showUploadList={false} beforeUpload={uploadFavicon}><Button icon={<UploadOutlined />}>Upload favicon</Button></Upload>
            </Space>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card className="bdg-card" title="Preview" size="small">
          <Form.Item noStyle shouldUpdate>
            {() => (
              <div style={{ padding: 20, background: "var(--navy-700)", borderRadius: 8, border: "1px solid var(--border-dim)" }}>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{form.getFieldValue("app_name") || "BDG Help Center"}</div>
                <div style={{ color: "#8ea0bd", fontSize: 12, marginTop: 4 }}>Business Admin Console</div>
                {form.getFieldValue("chat_icon_url") && <img src={form.getFieldValue("chat_icon_url")} alt="chat icon" style={{ width: 48, height: 48, marginTop: 16, borderRadius: 999 }} />}
                <Button type="primary" style={{ marginTop: 16, display: "block" }}>Primary action</Button>
              </div>
            )}
          </Form.Item>
        </Card>
      </Col>
    </Row>
  );
}
