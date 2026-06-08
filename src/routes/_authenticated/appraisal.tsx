import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RatingBadge, classify } from "@/components/RatingBadge";
import { toast } from "sonner";
import { Plus, Trash2, FileSignature, Save, Send, AlertCircle, CheckCircle2, FileDown, Gavel } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateAppraisalPdf, getAppraisalPdfUrl } from "@/lib/pdf.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/appraisal")({
  head: () => ({ meta: [{ title: "My Appraisal — Bungoma EPMS" }] }),
  component: AppraisalPage,
});

type TargetRow = {
  id?: string;
  target: string;
  indicator: string;
  weight: number;
  expected_outcome: string;
  achieved_result: string;
  score: number;
  sort_order: number;
};

const period = `FY ${new Date().getFullYear()}/${(new Date().getFullYear() + 1).toString().slice(-2)}`;

function AppraisalPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [appraisalId, setAppraisalId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Record<string, string | null> | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [supervisorId, setSupervisorId] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [supervisorComments, setSupervisorComments] = useState<string | null>(null);
  const [supervisorReviewedAt, setSupervisorReviewedAt] = useState<string | null>(null);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["appraisal", user.id],
    queryFn: async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const { data: existing } = await supabase
        .from("appraisals")
        .select("*, targets(*)")
        .eq("employee_id", user.id)
        .eq("period", period)
        .maybeSingle();
      const { data: sups } = await supabase.rpc("list_supervisors");
      return { profile: prof, existing, supervisors: (sups ?? []) as Array<{ id: string; full_name: string; designation: string | null; department: string | null }> };
    },
  });

  useEffect(() => {
    if (!data) return;
    setProfile(data.profile);
    if (data.existing) {
      setAppraisalId(data.existing.id);
      setStatus(data.existing.status);
      setSignedAt(data.existing.employee_signed_at);
      setSupervisorId(data.existing.chosen_supervisor_id ?? "");
      setRejectionReason(data.existing.rejection_reason ?? null);
      setSupervisorComments(data.existing.supervisor_comments ?? null);
      setSupervisorReviewedAt(data.existing.supervisor_reviewed_at ?? null);
      const sorted = [...(data.existing.targets ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      setTargets(sorted.map((t) => ({
        id: t.id,
        target: t.target ?? "",
        indicator: t.indicator ?? "",
        weight: Number(t.weight) || 0,
        expected_outcome: t.expected_outcome ?? "",
        achieved_result: t.achieved_result ?? "",
        score: Number(t.score) || 0,
        sort_order: t.sort_order,
      })));
    } else if (targets.length === 0) {
      setTargets([blankTarget(0)]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const totals = useMemo(() => {
    const w = targets.reduce((a, t) => a + (Number(t.weight) || 0), 0);
    const ws = targets.reduce((a, t) => a + (Number(t.weight) || 0) * (Number(t.score) || 0), 0);
    const pct = w > 0 ? ws / w : null;
    return { weight: w, pct, rating: classify(pct) };
  }, [targets]);

  const locked = status === "submitted" || status === "approved";

  function blankTarget(order: number): TargetRow {
    return { target: "", indicator: "", weight: 0, expected_outcome: "", achieved_result: "", score: 0, sort_order: order };
  }
  function updateTarget(i: number, patch: Partial<TargetRow>) {
    setTargets((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  async function ensureAppraisal(): Promise<string> {
    if (appraisalId) return appraisalId;
    const { data: created, error } = await supabase
      .from("appraisals")
      .insert({ employee_id: user.id, period, status: "draft", chosen_supervisor_id: supervisorId || null })
      .select()
      .single();
    if (error) throw error;
    setAppraisalId(created.id);
    return created.id;
  }

  async function saveAll(submit = false) {
    if (submit && !supervisorId) {
      toast.error("Choose the supervisor who will appraise you before submitting.");
      return;
    }
    if (submit && totals.weight !== 100) {
      toast.error("Target weights must sum to exactly 100% before submission.");
      return;
    }
    setSaving(true);
    try {
      const id = await ensureAppraisal();

      const existingIds = (data?.existing?.targets ?? []).map((t: { id: string }) => t.id);
      const keptIds = targets.map((t) => t.id).filter(Boolean) as string[];
      const toDelete = existingIds.filter((eid: string) => !keptIds.includes(eid));
      if (toDelete.length) await supabase.from("targets").delete().in("id", toDelete);

      for (const [i, t] of targets.entries()) {
        const payload = {
          appraisal_id: id, target: t.target, indicator: t.indicator, weight: t.weight,
          expected_outcome: t.expected_outcome, achieved_result: t.achieved_result, score: t.score, sort_order: i,
        };
        if (t.id) await supabase.from("targets").update(payload).eq("id", t.id);
        else {
          const { data: ins } = await supabase.from("targets").insert(payload).select().single();
          if (ins) t.id = ins.id;
        }
      }

      const newStatus = submit ? "submitted" : status === "rejected" ? "draft" : status;
      await supabase.from("appraisals").update({
        status: newStatus,
        total_score: totals.pct,
        rating: totals.rating,
        chosen_supervisor_id: supervisorId || null,
        rejection_reason: submit ? null : rejectionReason,
      }).eq("id", id);

      setStatus(newStatus);
      if (submit) setRejectionReason(null);
      toast.success(submit ? "Submitted to your supervisor" : "Draft saved");
      qc.invalidateQueries({ queryKey: ["appraisal", user.id] });
      qc.invalidateQueries({ queryKey: ["dashboard", user.id] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function signEmployee() {
    const id = await ensureAppraisal();
    const ts = new Date().toISOString();
    await supabase.from("appraisals").update({ employee_signed_at: ts }).eq("id", id);
    setSignedAt(ts);
    toast.success("Target agreement signed");
    qc.invalidateQueries({ queryKey: ["appraisal", user.id] });
  }

  if (isLoading) return <div className="min-h-screen"><AppHeader authenticated userId={user.id} /><div className="p-10 text-center text-muted-foreground">Loading appraisal…</div></div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader authenticated userId={user.id} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">Staff Performance Appraisal — {period}</div>
            <h1 className="mt-2 font-display text-3xl font-bold">My Appraisal</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider">{status}</span>
            <RatingBadge rating={totals.rating ?? undefined} score={totals.pct ?? undefined} />
          </div>
        </div>

        {/* Status banners */}
        {status === "rejected" && rejectionReason && (
          <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              <div>
                <div className="font-semibold text-destructive">Returned for revision</div>
                <p className="mt-1 text-sm">{rejectionReason}</p>
                <p className="mt-2 text-xs text-muted-foreground">Make changes and resubmit when ready. Saving will return this appraisal to draft.</p>
              </div>
            </div>
          </div>
        )}
        {status === "approved" && (
          <div className="mt-6 rounded-lg border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="font-semibold text-primary">Approved by your supervisor</div>
                {supervisorComments && <p className="mt-1 text-sm">{supervisorComments}</p>}
                {supervisorReviewedAt && <p className="mt-1 text-xs text-muted-foreground">on {new Date(supervisorReviewedAt).toLocaleString()}</p>}
              </div>
            </div>
          </div>
        )}
        {status === "submitted" && (
          <div className="mt-6 rounded-lg border border-gold/40 bg-gold/10 p-4 text-sm">
            Awaiting supervisor review. You'll be notified when there's an update.
          </div>
        )}

        {/* SECTION 1 */}
        <Card className="mt-6 p-6">
          <SectionHeader number="1" title="Employment Details" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ReadOnly label="Name" value={profile?.full_name} />
            <ReadOnly label="Personal Number" value={profile?.employee_no} />
            <ReadOnly label="Designation" value={profile?.designation} />
            <ReadOnly label="Job Group" value={profile?.job_group} />
            <ReadOnly label="Department" value={profile?.department} />
            <ReadOnly label="Directorate" value={profile?.directorate} />
            <ReadOnly label="Work Station" value={profile?.work_station} />
            <ReadOnly label="Email" value={profile?.email} />
          </div>
        </Card>

        {/* SUPERVISOR PICKER */}
        <Card className="mt-6 p-6">
          <SectionHeader number="★" title="Choose your appraising supervisor" />
          <p className="mt-2 text-sm text-muted-foreground">
            The supervisor you pick here will receive your appraisal for review, approval, and sign-off.
          </p>
          <div className="mt-4 max-w-md">
            <Label className="mb-1.5 block text-xs">Supervisor</Label>
            <Select value={supervisorId} onValueChange={setSupervisorId} disabled={locked}>
              <SelectTrigger><SelectValue placeholder="Select a supervisor…" /></SelectTrigger>
              <SelectContent>
                {(data?.supervisors ?? []).length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No supervisors registered yet. Ask a System Admin to assign the Supervisor role.</div>
                ) : (
                  data?.supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}{s.designation ? ` — ${s.designation}` : ""}{s.department ? ` · ${s.department}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* SECTION 2A */}
        <Card className="mt-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <SectionHeader number="2A" title="Performance Targets" />
            <div className="text-right text-sm">
              <div className="text-muted-foreground">Total weight</div>
              <div className={`font-display text-2xl font-bold ${totals.weight === 100 ? "text-primary" : "text-destructive"}`}>{totals.weight}%</div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {targets.map((t, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">Target {i + 1}</div>
                  {!locked && (
                    <button onClick={() => setTargets((p) => p.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Agreed performance target"><Textarea disabled={locked} rows={2} value={t.target} onChange={(e) => updateTarget(i, { target: e.target.value })} /></Field>
                  <Field label="Performance indicator"><Textarea disabled={locked} rows={2} value={t.indicator} onChange={(e) => updateTarget(i, { indicator: e.target.value })} /></Field>
                  <Field label="Expected outcome"><Textarea disabled={locked} rows={2} value={t.expected_outcome} onChange={(e) => updateTarget(i, { expected_outcome: e.target.value })} /></Field>
                  <Field label="Achieved result"><Textarea disabled={locked} rows={2} value={t.achieved_result} onChange={(e) => updateTarget(i, { achieved_result: e.target.value })} /></Field>
                  <Field label="Weight (%)"><Input disabled={locked} type="number" min={0} max={100} value={t.weight} onChange={(e) => updateTarget(i, { weight: Number(e.target.value) })} /></Field>
                  <Field label="Appraisal score (0-100)"><Input disabled={locked} type="number" min={0} max={150} value={t.score} onChange={(e) => updateTarget(i, { score: Number(e.target.value) })} /></Field>
                </div>
              </div>
            ))}
            {!locked && (
              <Button variant="outline" onClick={() => setTargets((p) => [...p, blankTarget(p.length)])}>
                <Plus className="mr-1.5 h-4 w-4" /> Add target
              </Button>
            )}
          </div>
        </Card>

        {/* SECTION 2C */}
        <Card className="mt-6 p-6">
          <SectionHeader number="2C" title="Target Agreement Signatures" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-dashed border-border p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employee signature</div>
              {signedAt ? (
                <div className="mt-2">
                  <div className="font-display text-lg font-bold italic text-primary">{profile?.full_name}</div>
                  <div className="text-xs text-muted-foreground">Signed {new Date(signedAt).toLocaleString()}</div>
                </div>
              ) : (
                <Button className="mt-2" variant="outline" onClick={signEmployee} disabled={locked}>
                  <FileSignature className="mr-1.5 h-4 w-4" /> Sign digitally
                </Button>
              )}
            </div>
            <div className="rounded-lg border border-dashed border-border p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supervisor signature</div>
              {status === "approved" && supervisorReviewedAt ? (
                <div className="mt-2">
                  <div className="font-display text-lg font-bold italic text-primary">Approved & signed</div>
                  <div className="text-xs text-muted-foreground">on {new Date(supervisorReviewedAt).toLocaleString()}</div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">Pending supervisor review</div>
              )}
            </div>
          </div>
        </Card>

        {/* Rating Matrix preview */}
        <Card className="mt-6 p-6">
          <SectionHeader number="8" title="Performance Rating Matrix" />
          <p className="mt-2 text-sm text-muted-foreground">Live, weighted score across all targets.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs sm:grid-cols-5">
            {[["Poor","≤49%"],["Fair","50-64%"],["Good","65-84%"],["Very Good","85-100%"],["Excellent","101%+"]].map(([l, r]) => (
              <div key={l} className={`rounded-lg border p-3 ${totals.rating === l ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}>
                <div className={`font-display text-sm font-bold ${totals.rating === l ? "text-primary" : ""}`}>{l}</div>
                <div className="text-muted-foreground">{r}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sticky action bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="text-xs text-muted-foreground">
              {!supervisorId && <span className="text-destructive">Choose a supervisor.</span>}
              {supervisorId && totals.weight !== 100 && <span className="text-destructive">Weights must total 100% to submit.</span>}
              {locked && <span>This appraisal is {status} and read-only.</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => saveAll(false)} disabled={saving || locked}>
                <Save className="mr-1.5 h-4 w-4" /> Save draft
              </Button>
              <Button onClick={() => saveAll(true)} disabled={saving || locked || totals.weight !== 100 || !supervisorId}>
                <Send className="mr-1.5 h-4 w-4" /> Submit to supervisor
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">{number}</div>
      <h2 className="font-display text-xl font-bold">{title}</h2>
    </div>
  );
}
function ReadOnly({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value || <span className="text-muted-foreground">—</span>}</div>
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
