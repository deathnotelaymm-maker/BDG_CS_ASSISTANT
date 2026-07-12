import { createFileRoute } from "@tanstack/react-router";
import { Card, Form, Input, Switch, Button, message, Row, Col } from "antd";

export const Route = createFileRoute("/_admin/support-settings")({
  component: SupportSettingsPage,
});

function SupportSettingsPage() {
  const [form] = Form.useForm();
  const save = () => form.validateFields().then(() => message.success("Support settings saved"));
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={14}>
        <Card className="bdg-card" title="Support Channels" size="small">
          <Form form={form} layout="vertical" initialValues={{
            liveChat: true, email: "support@bdg.io", telegram: "@bdg_support", hours: "24/7", escalation: true,
          }}>
            <Form.Item label="Live chat enabled" name="liveChat" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item label="Support email" name="email"><Input /></Form.Item>
            <Form.Item label="Telegram handle" name="telegram"><Input /></Form.Item>
            <Form.Item label="Working hours" name="hours"><Input /></Form.Item>
            <Form.Item label="Auto-escalation" name="escalation" valuePropName="checked"><Switch /></Form.Item>
            <Button type="primary" onClick={save}>Save changes</Button>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card className="bdg-card" title="Notification templates" size="small">
          <Form layout="vertical">
            <Form.Item label="Ticket received"><Input.TextArea rows={3} defaultValue="Hi {{name}}, we received your request..." /></Form.Item>
            <Form.Item label="Ticket resolved"><Input.TextArea rows={3} defaultValue="Your request has been resolved. Thank you!" /></Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
