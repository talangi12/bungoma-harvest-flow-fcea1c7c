import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoles, hasAnyRole } from "@/hooks/useRoles";
import { AlertTriangle, ArrowLeft, Download, Clock, ListFilter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/escalations")({
  head: () => ({ meta: [{ title: "Escalations dashboard — Bungoma EPMS" }] }),
  component: EscalationsDashboard,
});

type Row = {
  id: string; period: string; status: string;
  supervisor_deadline: string | null;
  escalated_at: string | null; escalation_count: number;
  employee: { full_name: string | null; department: string | null; directorate: string | null } | null;
};

function fmt(ms: number) {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  return `${ms < 0 ? "-" : ""}${h}h ${m}m`;
}

function EscalationsDashboard() {
  const { user } = Route.useRouteContext();
  const { data: roles } = useRoles(user.id);
  const allowed = hasAnyRole(roles, ["system_admin", "super_admin", "hr"]);
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState<"all" | "overdue" | "escalated" | "pending">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["escalations-dashboard"],
    enabled: allowed,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("appraisals")
        .select("id,period,status,supervisor_deadline,escalated_at,escalation_count,employee:profiles!appraisals_employee_id_fkey(full_name,department,directorate)")
        .eq("status", "submitted")
        .order("supervisor_deadline", { ascending: true });
      return (rows ?? []) as unknown as Row[];
    },
  });

  const filtered = useMemo(() => {
    const now = Date.now();
    return (data ?? []).filter((r) => {
      if (dept && !r.employee?.department?.toLowerCase().includes(dept.toLowerCase())) return false;
      if (status === "overdue") return r.supervisor_deadline && new Date(r.supervisor_deadline).getTime() < now && !r.escalated_at;
      if (status === "escalated") return !!r.escalated_at;
      if (status === "pending") return r.supervisor_deadline && new Date(r.supervisor_deadline).getTime() >= now;
      return true;
    });
  }, [data, dept, status]);

  const stats = useMemo(() => {
    const now = Date.now();
    const all = data ?? [];
    const overdue = all.filter(r => r.supervisor_deadline && new Date(r.supervisor_deadline).getTime() < now && !r.escalated_at).length;
    const escalated = all.filter(r => !!r.escalated_at).length;
    const pending = all.filter(r => r.supervisor_deadline && new Date(r.supervisor_deadline).getTime() >= now).length;
    const byDept = new Map<string, number>();
    all.forEach(r => {
      if (!r.escalated_at) return;
      const d = r.employee?.department ?? "Unknown";
      byDept.set(d, (byDept.get(d) ?? 0) + 1);
    });
    return { overdue, escalated, pending, byDept: [...byDept.entries()].sort((a, b) => b[1] - a[1]) };
  }, [data]);

  async function exportPdf() {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text("Bungoma EPMS — Escalations Report", 40, 50);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 68);
      doc.text(`Overdue: ${stats.overdue}   Escalated: ${stats.escalated}   Pending: ${stats.pending}`, 40, 84);

      let y = 110;
      doc.setFont("helvetica", "bold"); doc.text("Escalations by department", 40, y); y += 16;
      doc.setFont("helvetica", "normal");
      stats.byDept.forEach(([d, c]) => { doc.text(`• ${d}: ${c}`, 50, y); y += 14; });

      y += 10; doc.setFont("helvetica", "bold"); doc.text("Records", 40, y); y += 16;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      filtered.forEach((r) => {
        if (y > 780) { doc.addPage(); y = 50; }
        const due = r.supervisor_deadline ? new Date(r.supervisor_deadline).toLocaleString() : "—";
        const flag = r.escalated_at ? "ESCALATED" : (r.supervisor_deadline && new Date(r.supervisor_deadline).getTime() < Date.now() ? "OVERDUE" : "PENDING");
        doc.text(`${flag}  ·  ${r.employee?.full_name ?? "?"}  (${r.employee?.department ?? "?"})  ·  ${r.period}  ·  due ${due}`, 40, y);
        y += 12;
      });
      doc.save(`escalations-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed");
    }
  }

  async function runMaintenance() {
    const t = toast.loading("Running maintenance…");
    try {
      const [{ data: e }, { data: c }] = await Promise.all([
        supabase.rpc("escalate_overdue_appraisals"),
        supabase.rpc("archive_expired_contracts"),
      ]);
      toast.success(`Escalated ${e ?? 0} · Archived ${c ?? 0}`, { id: t });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed", { id: t });
    }
  }

  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader authenticated userId={user.id} />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"><ArrowLeft className="h-3 w-3" /> Admin</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">Escalations dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor 72-hour supervisor SLA, overdue queues and departmental trends.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card className="p-4"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Overdue (awaiting escalation)</div><div className="font-display text-3xl font-bold text-destructive">{stats.overdue}</div></Card>
          <Card className="p-4"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Already escalated</div><div className="font-display text-3xl font-bold">{stats.escalated}</div></Card>
          <Card className="p-4"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Within SLA</div><div className="font-display text-3xl font-bold text-primary">{stats.pending}</div></Card>
        </div>

        <Card className="mt-6 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]"><label className="text-xs text-muted-foreground">Department</label><Input placeholder="Filter department…" value={dept} onChange={e => setDept(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className="block h-9 rounded-md border bg-background px-2 text-sm">
                <option value="all">All submitted</option><option value="overdue">Overdue</option><option value="escalated">Escalated</option><option value="pending">Within SLA</option>
              </select>
            </div>
            <Button variant="outline" onClick={runMaintenance}><Clock className="mr-2 h-4 w-4" />Run escalation pass</Button>
            <Button onClick={exportPdf}><Download className="mr-2 h-4 w-4" />Export PDF</Button>
          </div>
        </Card>

        <Card className="mt-6 p-4">
          <h2 className="font-display text-lg font-bold flex items-center gap-2"><ListFilter className="h-4 w-4" />Escalations by department</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.byDept.length === 0 && <div className="text-xs text-muted-foreground">No escalations yet.</div>}
            {stats.byDept.map(([d, c]) => (
              <div key={d} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                <span className="text-sm">{d}</span><span className="font-bold">{c}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider"><tr>
              <th className="px-3 py-2">Employee</th><th className="px-3 py-2">Department</th><th className="px-3 py-2">Period</th>
              <th className="px-3 py-2">Deadline</th><th className="px-3 py-2">Time left</th><th className="px-3 py-2">State</th><th className="px-3 py-2"></th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No matching records.</td></tr>}
              {filtered.map((r) => {
                const dl = r.supervisor_deadline ? new Date(r.supervisor_deadline).getTime() : null;
                const diff = dl ? dl - Date.now() : null;
                const over = diff !== null && diff < 0;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.employee?.full_name ?? "—"}</td>
                    <td className="px-3 py-2">{r.employee?.department ?? "—"}</td>
                    <td className="px-3 py-2">{r.period}</td>
                    <td className="px-3 py-2 text-xs">{dl ? new Date(dl).toLocaleString() : "—"}</td>
                    <td className={`px-3 py-2 text-xs font-mono ${over ? "text-destructive" : ""}`}>{diff !== null ? fmt(diff) : "—"}</td>
                    <td className="px-3 py-2">{r.escalated_at ? <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Escalated ×{r.escalation_count}</span> : over ? <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700"><AlertTriangle className="inline h-3 w-3" /> Overdue</span> : <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">On track</span>}</td>
                    <td className="px-3 py-2"><Link to="/supervisor/review/$id" params={{ id: r.id }}><Button size="sm" variant="outline">Open</Button></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  );
}
