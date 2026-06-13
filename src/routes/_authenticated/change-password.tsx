import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { changeOwnPassword } from "@/lib/auth-helpers.functions";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({ meta: [{ title: "Change password — Bungoma EPMS" }] }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const changeFn = useServerFn(changeOwnPassword);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd !== confirm) return toast.error("Passwords do not match");
    if (pwd.length < 8) return toast.error("Use at least 8 characters");
    setBusy(true);
    try {
      await changeFn({ data: { new_password: pwd } });
      toast.success("Password updated.");
      const { data: rr } = await import("@/integrations/supabase/client").then(m => m.supabase.from("user_roles").select("role").eq("user_id", user.id));
      const adminRoles = new Set(["super_admin","system_admin","hr","governor","cec","chief_officer","director"]);
      const dest = (rr ?? []).some((r: { role: string }) => adminRoles.has(r.role)) ? "/admin" : "/dashboard";
      navigate({ to: dest, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader authenticated userId={user.id} />
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Account</div>
          <h1 className="mt-2 font-display text-3xl font-bold flex items-center gap-2"><KeyRound className="h-7 w-7 text-primary" /> Change password</h1>
          <p className="mt-1 text-sm text-muted-foreground">For security, please choose a new password.</p>
        </div>
        <Card className="mt-6 p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="np">New password</Label>
              <Input id="np" type="password" required minLength={8} value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cp">Confirm password</Label>
              <Input id="cp" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Update password"}</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
