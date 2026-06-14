import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import emblem from "@/assets/bungoma-emblem.png";
import landscape from "@/assets/bungoma-landscape.jpg";
import { resolveLoginEmail, bootstrapDefaultSuperAdmin } from "@/lib/auth-helpers.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Bungoma EPMS" }, { name: "description", content: "Sign in to the County Government of Bungoma Performance Management System." }] }),
  component: AuthPage,
});

function AuthPage() {
  const [idNumber, setIdNumber] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [personalNumber, setPersonalNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const resolveFn = useServerFn(resolveLoginEmail);
  const bootstrapFn = useServerFn(bootstrapDefaultSuperAdmin);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      window.location.href = await resolveDest(data.user.id);
    });
    bootstrapFn({}).catch(() => {});
  }, [bootstrapFn]);

  async function resolveDest(uid: string): Promise<string> {
    try {
      const { data: rr } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const adminRoles = new Set(["super_admin","system_admin","hr","governor","cec","chief_officer","director","appeals_committee"]);
      if ((rr ?? []).some((r) => adminRoles.has(r.role as string))) return "/admin";
    } catch { /* ignore */ }
    return "/dashboard";
  }

  async function recordEvent(success: boolean, userId: string | null, email: string | null, reason?: string) {
    try {
      await supabase.from("login_events").insert({
        user_id: userId,
        id_number: idNumber.trim() || null,
        email,
        success,
        failure_reason: reason ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      });
    } catch { /* non-blocking */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { email } = await resolveFn({ data: { id_number: idNumber.trim() } });
      const { data: signed, error } = await supabase.auth.signInWithPassword({ email, password: personalNumber });
      if (error) {
        await recordEvent(false, null, email, error.message);
        throw error;
      }
      await recordEvent(true, signed.user?.id ?? null, email);
      const dest = signed.user ? await resolveDest(signed.user.id) : "/dashboard";
      // Hard navigation guarantees the protected layout sees the fresh session.
      window.location.href = dest;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed. Check your ID Number and Personal Number.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={landscape} alt="Bungoma landscape" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-3">
            <img src={emblem} alt="" className="h-12 w-12 object-contain" width={48} height={48} />
            <div>
              <div className="font-display text-lg font-bold">Bungoma EPMS</div>
              <div className="text-[11px] uppercase tracking-widest opacity-80">County Government of Bungoma</div>
            </div>
          </Link>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight text-balance">Performance.<br />Integrity.<br />Service.</h2>
            <p className="mt-4 max-w-md text-primary-foreground/85">A modern Enterprise Performance Management System for the County Government of Bungoma — built for over 7,000 public servants.</p>
          </div>
          <div className="text-xs opacity-70">© {new Date().getFullYear()} County Government of Bungoma</div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={emblem} alt="" className="h-10 w-10 object-contain" width={40} height={40} />
            <div>
              <div className="font-display text-base font-bold text-primary">Bungoma EPMS</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">County Government of Bungoma</div>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your National ID Number and Personal Number.</p>

          <Card className="mt-6 p-6 shadow-card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="idn">ID Number</Label>
                <Input id="idn" required value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. 12345678" autoComplete="username" />
              </div>
              <div>
                <Label htmlFor="pnum">Personal Number</Label>
                <Input id="pnum" type="password" required value={personalNumber} onChange={(e) => setPersonalNumber(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Please wait…" : "Sign in"}
              </Button>
            </form>
          </Card>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            New employees are onboarded by their Director. Contact your departmental administrator if you cannot sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
