import { ReactNode, useEffect, useState } from "react";
import {
  Layout,
  Menu,
  Dropdown,
  Avatar,
  Space,
  Breadcrumb,
  Select,
  Tag,
  ConfigProvider,
  theme,
} from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
  RobotOutlined,
  HistoryOutlined,
  MonitorOutlined,
  MessageOutlined,
  MessageFilled,
  BgColorsOutlined,
  AuditOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  DownOutlined,
  LinkOutlined,
  CloudUploadOutlined,
  ApartmentOutlined,
  GlobalOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate, useMatches } from "@tanstack/react-router";
import { api, getActiveAdminPlatformRoute, getCurrentUser, logout } from "@/lib/api";

const { Sider, Header, Content } = Layout;
const ADMIN_VERSION = "v1.10.0";

const NAV: { key: string; to: string; label: string; icon: ReactNode; group?: string }[] = [
  {
    key: "/dashboard",
    to: "/dashboard",
    label: "Dashboard",
    icon: <DashboardOutlined />,
    group: "OVERVIEW",
  },
  {
    key: "/platform-control-center",
    to: "/platform-control-center",
    label: "Platform Control Center",
    icon: <ApartmentOutlined />,
    group: "PLATFORM",
  },

  {
    key: "/site-content",
    to: "/site-content",
    label: "Site Content",
    icon: <FileTextOutlined />,
    group: "CONTENT",
  },
  {
    key: "/categories",
    to: "/categories",
    label: "Categories",
    icon: <AppstoreOutlined />,
    group: "CONTENT",
  },
  {
    key: "/guide-images",
    to: "/guide-images",
    label: "Guide",
    icon: <FileTextOutlined />,
    group: "CONTENT",
  },
  { key: "/faq", to: "/faq", label: "FAQ", icon: <QuestionCircleOutlined />, group: "CONTENT" },

  {
    key: "/ai-prompt-manager",
    to: "/ai-prompt-manager",
    label: "AI Prompt Manager",
    icon: <RobotOutlined />,
    group: "AI",
  },
  {
    key: "/ai-content-studio",
    to: "/ai-content-studio",
    label: "AI Prompt & Image",
    icon: <BulbOutlined />,
    group: "AI",
  },
  {
    key: "/ai-knowledge-import",
    to: "/ai-knowledge-import",
    label: "AI Knowledge Import",
    icon: <CloudUploadOutlined />,
    group: "AI",
  },
  {
    key: "/ai-qa",
    to: "/ai-qa",
    label: "AI Q&A",
    icon: <MessageFilled />,
    group: "AI",
  },
  {
    key: "/ai-source-router",
    to: "/ai-source-router",
    label: "AI Source Router",
    icon: <ShareAltOutlined />,
    group: "AI",
  },
  {
    key: "/locale-studio",
    to: "/locale-studio",
    label: "Locale Studio",
    icon: <GlobalOutlined />,
    group: "AI",
  },
  {
    key: "/prompt-history",
    to: "/prompt-history",
    label: "Prompt Version History",
    icon: <HistoryOutlined />,
    group: "AI",
  },
  {
    key: "/action-buttons",
    to: "/action-buttons",
    label: "Buttons Configuration",
    icon: <LinkOutlined />,
    group: "AI",
  },
  {
    key: "/ai-diagnostics",
    to: "/ai-diagnostics",
    label: "AI Diagnostics",
    icon: <MonitorOutlined />,
    group: "AI",
  },

  {
    key: "/chat-quick-replies",
    to: "/chat-quick-replies",
    label: "Chat Quick Replies",
    icon: <MessageOutlined />,
    group: "CHAT",
  },
  {
    key: "/chat-logs",
    to: "/chat-logs",
    label: "Chat Logs",
    icon: <MessageFilled />,
    group: "CHAT",
  },
  {
    key: "/unmatched-questions",
    to: "/unmatched-questions",
    label: "Unmatched Questions",
    icon: <MessageOutlined />,
    group: "CHAT",
  },

  {
    key: "/theme-settings",
    to: "/theme-settings",
    label: "Theme Settings",
    icon: <BgColorsOutlined />,
    group: "SETTINGS",
  },
  {
    key: "/audit-logs",
    to: "/audit-logs",
    label: "Audit Logs",
    icon: <AuditOutlined />,
    group: "SETTINGS",
  },
  {
    key: "/admin-users",
    to: "/admin-users",
    label: "Admin Users",
    icon: <TeamOutlined />,
    group: "SETTINGS",
  },
];

const ZH: Record<string, string> = {
  Dashboard: "仪表盘",
  "Site Content": "网站内容",
  Categories: "分类",
  Guide: "指南",
  FAQ: "常见问题",
  "AI Prompt Manager": "AI 提示词管理",
  "AI Prompt & Image": "AI 提示与图片",
  "AI Knowledge Import": "AI 知识导入",
  "AI Q&A": "AI 问答",
  "AI Source Router": "AI 来源路由",
  "Prompt Version History": "提示词版本历史",
  "Buttons Configuration": "按钮配置",
  "AI Diagnostics": "AI 诊断",
  "Chat Quick Replies": "聊天快捷回复",
  "Chat Logs": "聊天记录",
  "Unmatched Questions": "未匹配问题",
  "Theme Settings": "主题设置",
  "Audit Logs": "审计日志",
  "Admin Users": "管理员账号",
  "Platform Control Center": "平台控制中心",
  PLATFORM: "平台",
  OVERVIEW: "概览",
  CONTENT: "内容",
  AI: "AI",
  CHAT: "聊天",
  SETTINGS: "设置",
  Console: "控制台",
  "Sign out": "退出登录",
  "My Profile": "我的资料",
};
function langNow() {
  try {
    return localStorage.getItem("bdg_admin_lang") || "en";
  } catch {
    return "en";
  }
}
function tr(v?: string) {
  if (!v) return "";
  return langNow() === "zh" ? ZH[v] || v : v;
}

function buildMenu(userRole?: string, canManagePlatform = false): MenuProps["items"] {
  const groups = new Map<string, typeof NAV>();
  for (const item of NAV) {
    if (item.key === "/admin-users" && userRole !== "owner" && !(getActiveAdminPlatformRoute() && canManagePlatform)) continue;
    const g = item.group || "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(item);
  }
  const items: MenuProps["items"] = [];
  for (const [group, list] of groups) {
    items.push({
      key: `g-${group}`,
      type: "group",
      label: tr(group),
      children: list.map((n) => ({
        key: n.key,
        icon: n.icon,
        label: <Link to={n.to}>{tr(n.label)}</Link>,
      })),
    });
  }
  return items;
}

export default function AdminLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [adminLang, setAdminLang] = useState(langNow());
  const [platformContext, setPlatformContext] = useState<any>(null);
  const user = getCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const matches = useMatches();
  const current = NAV.find((n) => location.pathname.startsWith(n.key));

  useEffect(() => {
    if (!getActiveAdminPlatformRoute()) { setPlatformContext(null); return; }
    let alive = true;
    api.getPlatformContext().then((value) => { if (alive) setPlatformContext(value); }).catch(() => { if (alive) setPlatformContext(null); });
    return () => { alive = false; };
  }, [location.pathname]);

  const crumbTitle = title ?? current?.label ?? "Dashboard";

  const userMenu: MenuProps["items"] = [
    { key: "profile", icon: <UserOutlined />, label: tr("My Profile") },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: tr("Sign out"),
      onClick: () => {
        logout();
        navigate({ to: "/login" });
      },
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#3b82f6",
          colorBgBase: "#0b1220",
          colorBgContainer: "#0f172a",
          colorBgElevated: "#142033",
          colorBorder: "#1e2a44",
          colorText: "#e6edf7",
          colorTextSecondary: "#8ea0bd",
          borderRadius: 6,
          fontSize: 13,
        },
      }}
    >
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          className="bdg-sider"
          width={244}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
        >
          <div className="bdg-brand">
            <div className="bdg-brand-mark">AI</div>
            {!collapsed && (
              <div>
                <div className="bdg-brand-title">Luke Admin Control</div>
                <div className="bdg-brand-sub">
                  {adminLang === "zh" ? `业务管理后台 · ${ADMIN_VERSION}` : `Business Admin Console · ${ADMIN_VERSION}`}
                </div>
              </div>
            )}
          </div>
          <Menu
            mode="inline"
            selectedKeys={current ? [current.key] : []}
            items={buildMenu(user?.role, platformContext?.access?.can_manage_platform === true)}
            key={adminLang}
            style={{ paddingBottom: 24 }}
          />
        </Sider>

        <Layout>
          <Header className="bdg-header">
            <div>
              {platformContext?.platform && (
                <Tag color="blue" style={{ margin: 0 }}>
                  Platform: {platformContext.platform.platform_name} · {platformContext.access?.role || "viewer"}
                </Tag>
              )}
            </div>
            <Space size={12}>
              <Select
                value={adminLang}
                onChange={(v) => {
                  try {
                    localStorage.setItem("bdg_admin_lang", v);
                  } catch {
                    // Language preference is optional when browser storage is unavailable.
                  }
                  setAdminLang(v);
                }}
                size="small"
                style={{ width: 96 }}
                variant="borderless"
                options={[
                  { value: "en", label: "English" },
                  { value: "zh", label: "中文" },
                ]}
              />
              <Dropdown menu={{ items: userMenu }} trigger={["click"]}>
                <Space style={{ cursor: "pointer", color: "#e6edf7" }}>
                  <Avatar size={28} icon={<UserOutlined />} style={{ background: "#1d4ed8" }} />
                  <span>{user?.email || "admin@bdg.io"}</span>
                  <DownOutlined style={{ fontSize: 10 }} />
                </Space>
              </Dropdown>
            </Space>
          </Header>

          <Content className="bdg-content">
            <Breadcrumb
              className="bdg-crumbs"
              items={[
                { title: tr("Console") },
                { title: tr(current?.group ?? "Overview") },
                { title: tr(crumbTitle) },
              ]}
            />
            <div className="bdg-page-header">
              <div>
                <h1 className="bdg-page-title">{tr(crumbTitle)}</h1>
                {subtitle && <div className="bdg-page-sub">{subtitle}</div>}
              </div>
            </div>
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
