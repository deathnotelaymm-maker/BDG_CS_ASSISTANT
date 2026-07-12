import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adminApi, auth } from "@/lib/api";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin sign in — BDG CMS" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminApi.login(email, password);
      auth.set(res.token);
      toast.success("Welcome back");
      navigate({ to: "/admin" });
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="grid min-h-screen place-items-center px-4 font-sans"
      style={{ background: "var(--gradient-hero)" }}
    >
      <Card className="w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-lg font-display font-bold text-[color:var(--bdg-navy-deep)]"
            style={{ background: "var(--gradient-gold)" }}
          >
            B
          </span>
          <div>
            <div className="font-display text-base font-semibold">BDG Guide CMS</div>
            <div className="text-xs text-muted-foreground">Sign in to continue</div>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@bdg.com" className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[color:var(--bdg-navy)] text-white hover:bg-[color:var(--bdg-navy-deep)]"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Preview mode: any credentials work.
        </p>
      </Card>
    </div>
  );
}