import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Form, Input, Button, Checkbox, ConfigProvider, theme, message, Alert } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [twofaRequired, setTwofaRequired] = useState(false);
  const onFinish = async (values: any) => {
    try {
      const res: any = await api.login(values.email, values.password, values.twofa_code);
      if (res?.twofa_required) {
        setTwofaRequired(true);
        message.info("Enter your 2FA code");
        return;
      }
      message.success("Signed in");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      message.error(e?.message || "Sign in failed");
    }
  };
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: "#3b82f6", colorBgContainer: "#0f172a", borderRadius: 6 },
      }}
    >
      <div className="bdg-login-wrap">
        <div className="bdg-login-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div className="bdg-brand-mark">B</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 600 }}>BDG Help Center</div>
              <div style={{ color: "#8ea0bd", fontSize: 12 }}>Business Admin Console / 业务管理后台</div>
            </div>
          </div>
          <h2 style={{ color: "#fff", marginBottom: 4, fontSize: 20 }}>Sign in / 登录</h2>
          <p style={{ color: "#8ea0bd", marginTop: 0, marginBottom: 20, fontSize: 13 }}>
            Enter your credentials to access the admin console. / 输入账号密码进入管理后台。
          </p>
          <Form layout="vertical" onFinish={onFinish} initialValues={{ email: "" }}>
            {twofaRequired && <Alert type="info" showIcon message="2FA required" description="Open your authenticator app and enter the 6-digit code." style={{ marginBottom: 16 }} />}
            <Form.Item label="Email / 邮箱" name="email" rules={[{ required: true, type: "email" }]}>
              <Input size="large" prefix={<UserOutlined />} placeholder="you@bdg.io" />
            </Form.Item>
            <Form.Item label="Password / 密码" name="password" rules={[{ required: true }]}>
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" />
            </Form.Item>
            {twofaRequired && (
              <Form.Item label="2FA code" name="twofa_code" rules={[{ required: true, len: 6 }]}>
                <Input size="large" maxLength={6} placeholder="123456" />
              </Form.Item>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <Checkbox>Remember me / 记住我</Checkbox>
              <a style={{ color: "#3b82f6" }}>Forgot password? / 忘记密码?</a>
            </div>
            <Button type="primary" htmlType="submit" size="large" block>Sign in / 登录</Button>
          </Form>
          <div style={{ marginTop: 20, fontSize: 12, color: "#55698a", textAlign: "center" }}>
            © 2026 BDG Service · Secure admin access
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
