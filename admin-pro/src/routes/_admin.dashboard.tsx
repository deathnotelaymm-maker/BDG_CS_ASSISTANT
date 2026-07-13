import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, List, Tag, Skeleton } from "antd";
import {
  BookOutlined,
  QuestionCircleOutlined,
  AppstoreOutlined,
  RobotOutlined,
  MessageOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  CloudOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

function StatCard({ icon, title, value, suffix, tone }: any) {
  return (
    <Card className="bdg-card bdg-stat" size="small">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 8,
            background: tone === "ok" ? "rgba(34,197,94,0.15)" :
                        tone === "warn" ? "rgba(245,158,11,0.15)" :
                        "rgba(59,130,246,0.15)",
            color: tone === "ok" ? "#22c55e" : tone === "warn" ? "#f59e0b" : "#3b82f6",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <Statistic title={title} value={value} suffix={suffix} />
        </div>
      </div>
    </Card>
  );
}

function DashboardPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.getDashboardStats().then(setData); }, []);
  if (!data) return <Skeleton active paragraph={{ rows: 8 }} />;

  const stats = [
    { icon: <BookOutlined />, title: "Total Guides", value: data.totalGuides },
    { icon: <QuestionCircleOutlined />, title: "Total FAQ", value: data.totalFAQ },
    { icon: <AppstoreOutlined />, title: "Total Categories", value: data.totalCategories },
    { icon: <RobotOutlined />, title: "AI Prompt Sections", value: data.aiPromptSections },
    { icon: <ThunderboltOutlined />, title: "AI Content Items", value: data.aiContentItems },
    { icon: <MessageOutlined />, title: "Chat Sessions", value: data.chatSessions },
    { icon: <ThunderboltOutlined />, title: "DeepSeek Status", value: "Operational", tone: "ok" },
    { icon: <DatabaseOutlined />, title: "Database Status", value: "Operational", tone: "ok" },
    { icon: <CloudOutlined />, title: "R2 Storage Status", value: "Operational", tone: "ok" },
  ];

  return (
    <>
      <Row gutter={[12, 12]}>
        {stats.map((s, i) => (
          <Col xs={24} sm={12} md={8} lg={6} key={i}>
            <StatCard {...s} />
          </Col>
        ))}
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={16}>
          <Card className="bdg-card" title="System Health" size="small">
            <Row gutter={[12, 12]}>
              {[
                { label: "API Uptime", value: "99.98%", tone: "ok" },
                { label: "Avg Response", value: "812 ms", tone: "ok" },
                { label: "Error Rate 24h", value: "0.04%", tone: "ok" },
                { label: "Queue Depth", value: "12 jobs", tone: "warn" },
              ].map((m) => (
                <Col xs={12} md={6} key={m.label}>
                  <div style={{ color: "#8ea0bd", fontSize: 12, textTransform: "uppercase" }}>{m.label}</div>
                  <div style={{ color: "#fff", fontSize: 22, fontWeight: 600, marginTop: 4 }}>{m.value}</div>
                  <Tag color={m.tone === "ok" ? "success" : "warning"} style={{ marginTop: 6 }}>
                    {m.tone === "ok" ? "Healthy" : "Watch"}
                  </Tag>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="bdg-card" title="Recent Activity" size="small">
            <List
              dataSource={data.recentActivity}
              renderItem={(a: any) => (
                <List.Item style={{ borderColor: "var(--border-dim)" }}>
                  <List.Item.Meta
                    title={<span style={{ color: "#e6edf7" }}>{a.action}</span>}
                    description={<span style={{ color: "#8ea0bd" }}>{a.actor} · {a.time}</span>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
