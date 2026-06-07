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

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-bold">Performance targets ({targets.length})</h2>
        <p className="text-sm text-muted-foreground">Total weight: <span className={totalWeight === 100 ? "text-primary font-semibold" : "text-destructive font-semibold"}>{totalWeight}%</span></p>
        <div className="mt-4 space-y-3">
          {targets.map((t, i) => (
            <div key={t.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">Target {i + 1}</div>
                <div className="text-right text-xs">
                  <span className="text-muted-foreground">Weight</span> <span className="font-semibold">{t.weight}%</span>
                  <span className="ml-3 text-muted-foreground">Score</span> <span className="font-semibold">{t.score ?? 0}</span>
                </div>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Detail label="Target" value={t.target} />
                <Detail label="Indicator" value={t.indicator} />
                <Detail label="Expected outcome" value={t.expected_outcome} />
                <Detail label="Achieved result" value={t.achieved_result} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-bold">Your review</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <Label className="mb-1.5 block text-xs">Overall comments (optional)</Label>
            <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Constructive feedback for the appraisee…" disabled={isFinal} />
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
              <Check className="mr-1.5 h-4 w-4" /> Approve & sign
            </Button>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <FileSignature className="h-4 w-4 text-primary" />
            <span>
              You {a.status} this appraisal{a.supervisor_reviewed_at ? ` on ${new Date(a.supervisor_reviewed_at).toLocaleString()}` : ""}.
            </span>
          </div>
        )}
      </Card>
    </Shell>
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
