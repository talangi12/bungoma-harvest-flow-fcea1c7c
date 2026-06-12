import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRoles, hasAnyRole, ROLE_LABELS, type AppRole } from "@/hooks/useRoles";
import { ShieldCheck, UserPlus } from "lucide-react";
import { createUserWithRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Admin · New User — Bungoma EPMS" }] }),
  component: AdminUsers,
});

const ROLES: AppRole[] = ["employee","supervisor","hr","system_admin","super_admin","appeals_committee","governor","cec","chief_officer","director"];

function AdminUsers() {
  const { user } = Route.useRouteContext();
  const { data: roles, isLoading } = useRoles(user.id);
  const allowed = hasAnyRole(roles, ["system_admin", "super_admin"]);
  const isSuper = hasAnyRole(roles, ["super_admin"]);
  const createFn = useServerFn(createUserWithRole);
  const qc = useQueryClient();

  const [form, setForm] = useState({
    email: "", password: "", full_name: "", designation: "", department: "", employee_no: "",
    role: "employee" as AppRole,
  });
  const [busy, setBusy] = useState(false);

  if (!isLoading && !allowed) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader authenticated userId={user.id} />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Card className="p-10 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-3 font-display text-2xl font-bold">Admins only</h1>
          </Card>
        </main>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createFn({ data: form });
      toast.success(`Created ${res.email}`);
      setForm({ email: "", password: "", full_name: "", designation: "", department: "", employee_no: "", role: "employee" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const assignable = isSuper ? ROLES : ROLES.filter((r) => r !== "super_admin");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader authenticated userId={user.id} />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Administration</div>
          <h1 className="mt-2 font-display text-3xl font-bold flex items-center gap-2"><UserPlus className="h-7 w-7 text-primary" /> Create user account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Provision accounts for HR officers, supervisors, system admins, and Appeals Committee members. They sign in with the email and password set here.
          </p>
        </div>

        <Card className="mt-6 p-6">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Employee number"><Input value={form.employee_no} onChange={(e) => setForm({ ...form, employee_no: e.target.value })} placeholder="e.g. BGM-001234" /></Field>
            <Field label="Email"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Temporary password"><Input type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" /></Field>
            <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
            <Field label="Department"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
            <Field label="Assign role">
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}>
                {assignable.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Link to="/admin/roles"><Button type="button" variant="outline">Manage existing roles</Button></Link>
              <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
