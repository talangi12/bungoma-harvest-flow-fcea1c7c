import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RatingBadge, classify } from "@/components/RatingBadge";
import { toast } from "sonner";
import { ArrowLeft, Check, X, FileSignature } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { sendEventEmail } from "@/lib/notify.functions";

export const Route = createFileRoute("/_authenticated/supervisor/review/$id")({
  head: () => ({ meta: [{ title: "Review Appraisal — Bungoma EPMS" }] }),
  component: ReviewAppraisal,
});

function ReviewAppraisal() {
  const { user } = Route.useRouteContext();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<Record<string, Record<string, unknown>>>({});

  function updateField(targetId: string, field: string, value: unknown) {
    setEdits((e) => ({ ...e, [targetId]: { ...(e[targetId] ?? {}), [field]: value } }));
  }

  async function saveEdits() {
    const keys = Object.keys(edits);
    if (keys.length === 0) { setEditing(false); return; }
    setBusy(true);
    try {
      // Snapshot current appraisal+targets
      const snap = { appraisal: data?.appraisal, targets: data?.appraisal?.targets };
      const { count } = await supabase.from("appraisal_versions").select("id", { count: "exact", head: true }).eq("appraisal_id", id);
      await supabase.from("appraisal_versions").insert({
        appraisal_id: id, version_no: (count ?? 0) + 1,
        snapshot: snap as never, changed_by: user.id,
        change_summary: `Supervisor edited ${keys.length} target(s)`,
      });
      for (const tid of keys) {
        const patch = edits[tid];
        const { error } = await supabase.from("targets").update(patch as never).eq("id", tid);
        if (error) throw error;
      }
      toast.success("Saved with version snapshot");
      setEdits({}); setEditing(false);
      qc.invalidateQueries({ queryKey: ["review", id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["review", id],
    queryFn: async () => {
      const { data: a, error } = await supabase
        .from("appraisals")
        .select("*, targets(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!a) return null;
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", a.employee_id).maybeSingle();
      return { appraisal: a, profile: prof };
    },
  });

  useEffect(() => {
    if (data?.appraisal?.supervisor_comments) setComments(data.appraisal.supervisor_comments);
  }, [data]);

  if (isLoading) return <Shell userId={user.id}><div className="p-10 text-center text-sm text-muted-foreground">Loading…</div></Shell>;
  if (!data?.appraisal) return <Shell userId={user.id}><Card className="p-10 text-center"><p>Appraisal not found.</p></Card></Shell>;

  const a = data.appraisal;
  const targets = [...(a.targets ?? [])].sort((x, y) => x.sort_order - y.sort_order);
  const totalWeight = targets.reduce((s, t) => s + (Number(t.weight) || 0), 0);
  const pct = totalWeight > 0
    ? targets.reduce((s, t) => s + (Number(t.weight) || 0) * (Number(t.score) || 0), 0) / totalWeight
    : null;
  const rating = classify(pct);

  const isFinal = a.status === "approved" || a.status === "rejected";

  async function decide(action: "approved" | "rejected") {
    if (action === "rejected" && reason.trim().length < 5) {
      toast.error("Provide a reason for rejection (min 5 characters).");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("appraisals")
        .update({
          status: action,
          rejection_reason: action === "rejected" ? reason.trim() : null,
          supervisor_comments: comments.trim() || null,
          supervisor_reviewed_at: new Date().toISOString(),
          supervisor_signed_at: action === "approved" ? new Date().toISOString() : a.supervisor_signed_at,
        })
        .eq("id", id);
      if (error) throw error;
      // Fire-and-forget email; failure is silently audit-logged in notification_log
      try {
        await sendNotifyFn({ data: {
          event_type: action === "approved" ? "appraisal_approved" : "appraisal_rejected",
          to_user_id: a.employee_id,
          related_appraisal_id: id,
          vars: { period: a.period ?? "", reason: reason.trim() },
        }});
      } catch { /* logged server-side */ }
      toast.success(action === "approved" ? "Appraisal approved" : "Appraisal returned for revision");
      qc.invalidateQueries({ queryKey: ["review", id] });
      qc.invalidateQueries({ queryKey: ["supervisor-inbox", user.id] });
      navigate({ to: "/supervisor/inbox" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell userId={user.id}>
      <div className="mb-4">
        <Link to="/supervisor/inbox" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to inbox
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Reviewing {a.period}</div>
          <h1 className="mt-2 font-display text-3xl font-bold">{data.profile?.full_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.profile?.designation} · {data.profile?.department} · Emp. {data.profile?.employee_no}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider">{a.status}</span>
          <RatingBadge rating={rating ?? undefined} score={pct ?? undefined} />
        </div>
      </div>

      <SlaBanner deadline={a.supervisor_deadline} escalatedAt={a.escalated_at} escalatedTo={a.escalated_to} status={a.status} />

      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Performance targets ({targets.length})</h2>
          {!isFinal && (
            <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>{editing ? "Stop editing" : "Edit targets"}</Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Total weight: <span className={totalWeight === 100 ? "text-primary font-semibold" : "text-destructive font-semibold"}>{totalWeight}%</span></p>
        <div className="mt-4 space-y-3">
          {targets.map((t, i) => (
            <div key={t.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">Target {i + 1}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Weight</span>
                  {editing ? (
                    <input type="number" defaultValue={Number(t.weight) || 0} className="w-16 rounded border border-border px-1 text-right" onChange={(e) => updateField(t.id, "weight", Number(e.target.value))} />
                  ) : <span className="font-semibold">{t.weight}%</span>}
                  <span className="ml-2 text-muted-foreground">Score</span>
                  {editing ? (
                    <input type="number" defaultValue={Number(t.score) || 0} className="w-16 rounded border border-border px-1 text-right" onChange={(e) => updateField(t.id, "score", Number(e.target.value))} />
                  ) : <span className="font-semibold">{t.score ?? 0}</span>}
                </div>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Detail label="Target" value={t.target} />
                <Detail label="Indicator" value={t.indicator} />
                <EditableDetail label="Expected outcome" value={t.expected_outcome} editing={editing} onChange={(v) => updateField(t.id, "expected_outcome", v)} />
                <EditableDetail label="Achieved result" value={t.achieved_result} editing={editing} onChange={(v) => updateField(t.id, "achieved_result", v)} />
              </div>
            </div>
          ))}
        </div>
        {editing && (
          <div className="mt-4 flex justify-end">
            <Button size="sm" onClick={saveEdits} disabled={busy}>Save edits (creates version)</Button>
          </div>
        )}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-bold">Your review</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <Label className="mb-1.5 block text-xs">Overall comments / recommendations</Label>
            <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Constructive feedback…" disabled={isFinal} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">If rejecting, briefly explain why</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Targets 3 and 4 need clearer indicators." disabled={isFinal} />
          </div>
        </div>

        {a.rejection_reason && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-destructive">Previous rejection reason</div>
            <p className="mt-1">{a.rejection_reason}</p>
          </div>
        )}

        {!isFinal ? (
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => decide("rejected")} disabled={busy}>
              <X className="mr-1.5 h-4 w-4" /> Reject & return
            </Button>
            <Button onClick={() => decide("approved")} disabled={busy}>
              <Check className="mr-1.5 h-4 w-4" /> Approve & lock
            </Button>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <FileSignature className="h-4 w-4 text-primary" />
            <span>
              You {a.status} this appraisal{a.supervisor_reviewed_at ? ` on ${new Date(a.supervisor_reviewed_at).toLocaleString()}` : ""}. Appraisal is now locked.
            </span>
          </div>
        )}
      </Card>
    </Shell>
  );
}

function SlaBanner({ deadline, escalatedAt, escalatedTo, status }: { deadline: string | null; escalatedAt: string | null; escalatedTo: string | null; status: string }) {
  if (status === "approved" || status === "rejected") return null;
  if (escalatedAt) {
    return (
      <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
        <b>⚠ Escalated</b> on {new Date(escalatedAt).toLocaleString()} {escalatedTo ? "to Departmental Chief Officer" : "(no Chief Officer found in department)"}. The Chief Officer may now review.
      </div>
    );
  }
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  const hours = Math.max(0, Math.floor(ms / 3_600_000));
  const cls = hours < 12 ? "border-red-300 bg-red-50 text-red-900" : hours < 36 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-900";
  return (
    <div className={`mt-4 rounded-lg border p-3 text-sm ${cls}`}>
      ⏱ <b>SLA:</b> {hours} hours remaining to action this appraisal before it auto-escalates to the Departmental Chief Officer.
    </div>
  );
}

function EditableDetail({ label, value, editing, onChange }: { label: string; value: string | null; editing: boolean; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      {editing ? (
        <input defaultValue={value ?? ""} className="mt-0.5 w-full rounded border border-border px-2 py-1 text-sm" onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="mt-0.5 text-sm">{value || <span className="text-muted-foreground">—</span>}</div>
      )}
    </div>
  );
}

function Shell({ children, userId }: { children: React.ReactNode; userId: string }) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader authenticated userId={userId} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}
