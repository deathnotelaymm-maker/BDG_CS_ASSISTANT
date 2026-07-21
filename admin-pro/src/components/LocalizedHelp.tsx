import { Alert, Select, Space } from "antd";
import { useState } from "react";

export type AdminHelpLocale = "en" | "zh" | "my";
export type AdminHelpCopy = { title: string; body: string; bullets?: string[] };

const labels: Record<AdminHelpLocale, string> = { en: "English", zh: "中文", my: "မြန်မာ" };

export default function LocalizedHelp({
  copies,
  type = "info",
}: {
  copies: Record<AdminHelpLocale, AdminHelpCopy>;
  type?: "info" | "warning" | "success";
}) {
  const [locale, setLocale] = useState<AdminHelpLocale>(() => {
    try {
      const value = localStorage.getItem("bdg_admin_lang");
      return value === "zh" || value === "my" ? value : "en";
    } catch { return "en"; }
  });
  const copy = copies[locale] || copies.en;
  return <Alert
    showIcon
    type={type}
    style={{ marginBottom: 12 }}
    message={<Space size="small"><span>{copy.title}</span><Select size="small" value={locale} onChange={setLocale} options={(Object.keys(labels) as AdminHelpLocale[]).map((value) => ({ value, label: labels[value] }))} /></Space>}
    description={<div><p style={{ marginBottom: copy.bullets?.length ? 8 : 0 }}>{copy.body}</p>{copy.bullets?.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{copy.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</div>}
  />;
}
