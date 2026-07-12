import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/support-settings")({
  component: SupportSettings,
});

function SupportSettings() {
  const [form, setForm] = useState({
    supportEnabled: true,
    liveChat: true,
    email: "support@bdg.example",
    phone: "+91 000 000 0000",
    hours: "24/7",
    replyTime: "Under 15 minutes",
    supportUrl: "/support",
  });
  return (
    <>
      <PageHeader
        title="Support settings"
        description="Control how the Support CTA and contact channels appear across the Help Center."
        actions={<Button className="bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)]" onClick={() => toast.success("Settings saved")}><Save className="mr-1 h-4 w-4" /> Save</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Availability</h3>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Enable support CTA globally</div>
              <div className="text-xs text-muted-foreground">Show contact support blocks on guide pages.</div>
            </div>
            <Switch checked={form.supportEnabled} onCheckedChange={(v) => setForm({ ...form, supportEnabled: v })} />
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Live chat</div>
              <div className="text-xs text-muted-foreground">Show 'Live chat' card on the Support page.</div>
            </div>
            <Switch checked={form.liveChat} onCheckedChange={(v) => setForm({ ...form, liveChat: v })} />
          </div>
          <div className="mb-3 space-y-1.5"><Label>Support URL</Label><Input value={form.supportUrl} onChange={(e) => setForm({ ...form, supportUrl: e.target.value })} /></div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Contact channels</h3>
          <div className="mb-3 space-y-1.5"><Label>Support email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="mb-3 space-y-1.5"><Label>Support phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="mb-3 space-y-1.5"><Label>Hours</Label><Input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
          <div className="mb-3 space-y-1.5"><Label>Typical reply time</Label><Input value={form.replyTime} onChange={(e) => setForm({ ...form, replyTime: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Custom note (optional)</Label><Textarea rows={3} placeholder="Shown under the support form." /></div>
        </Card>
      </div>
    </>
  );
}