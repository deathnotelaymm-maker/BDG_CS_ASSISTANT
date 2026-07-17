import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, Phone, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_public/support")({
  head: () => ({ meta: [{ title: "Support — BDG Help Center" }] }),
  component: Support,
});

function Support() {
  const [sent, setSent] = useState(false);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Contact support</h1>
        <p className="mt-1 text-sm text-muted-foreground">The platform support team is available to help.</p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <ContactCard icon={<MessageSquare className="h-5 w-5" />} title="Live chat" subtitle="Chat with an agent" cta="Start chat" />
        <ContactCard icon={<Mail className="h-5 w-5" />} title="Email" subtitle="support@bdg.example" cta="Send email" />
        <ContactCard icon={<Phone className="h-5 w-5" />} title="Phone" subtitle="+91 000 000 0000" cta="Call now" />
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Typical reply time: under 15 minutes
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Support request submitted");
            setSent(true);
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input required placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email or phone</Label>
              <Input required placeholder="you@example.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input required placeholder="Deposit not credited" />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea required placeholder="Describe your issue…" rows={5} />
          </div>
          <Button
            type="submit"
            className="w-full bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)] md:w-auto"
          >
            {sent ? "Sent — send another" : "Submit request"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function ContactCard({ icon, title, subtitle, cta }: { icon: React.ReactNode; title: string; subtitle: string; cta: string }) {
  return (
    <Card className="p-4">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--bdg-navy)] text-[color:var(--bdg-gold)]">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
      <Button variant="outline" size="sm" className="mt-3 w-full">{cta}</Button>
    </Card>
  );
}
