import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserCircle2, Upload, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — Bungoma EPMS" }] }),
  component: ProfilePage,
});

type Editable = {
  full_name: string;
  phone: string;
  designation: string;
  job_group: string;
  department: string;
  directorate: string;
  work_station: string;
  employee_no: string;
  national_id: string;
  employment_date: string;
  gender: string;
  disability_status: string;
};

const EMPTY: Editable = {
  full_name: "", phone: "", designation: "", job_group: "",
  department: "", directorate: "", work_station: "",
  employee_no: "", national_id: "", employment_date: "",
  gender: "", disability_status: "",
};

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Editable>(EMPTY);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["profile-edit", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      full_name: data.full_name ?? "",
      phone: (data as { phone_number?: string | null }).phone_number ?? data.phone ?? "",
      designation: data.designation ?? "",
      job_group: data.job_group ?? "",
      department: data.department ?? "",
      directorate: data.directorate ?? "",
      work_station: data.work_station ?? "",
      employee_no: data.employee_no ?? "",
      national_id: data.national_id ?? "",
      employment_date: data.employment_date ?? "",
      gender: (data as { gender?: string | null }).gender ?? "",
      disability_status: (data as { disability_status?: string | null }).disability_status ?? "",
    });
    if (data.photo_url) {
      // photo_url stored as storage path "userId/filename"
      supabase.storage.from("avatars").createSignedUrl(data.photo_url, 3600).then((r) => {
        if (r.data?.signedUrl) setPhotoUrl(r.data.signedUrl);
      });
    }
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      // Appraisees may only update their department & work station.
      // All other employment details are auto-generated from the import record.
      const { error } = await supabase.from("profiles").update({
        department: form.department || null,
        work_station: form.work_station || null,
        phone_number: form.phone || null,
      } as never).eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile-edit", user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (file.size > 3 * 1024 * 1024) return toast.error("Photo must be 3MB or smaller");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Only JPEG, PNG or WebP allowed");
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ photo_url: path }).eq("id", user.id);
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    if (signed?.signedUrl) setPhotoUrl(signed.signedUrl);
    toast.success("Profile photo updated");
    qc.invalidateQueries({ queryKey: ["profile-edit", user.id] });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader authenticated userId={user.id} />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">My account</div>
          <h1 className="mt-2 font-display text-3xl font-bold">Profile & employment details</h1>
          <p className="mt-1 text-sm text-muted-foreground">Keep your record accurate. Changes here flow into every new appraisal.</p>
        </div>

        <Card className="mt-6 p-6">
          <div className="flex items-center gap-5">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <UserCircle2 className="h-full w-full text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">{form.full_name || "Officer"}</h2>
              <p className="text-xs text-muted-foreground">{form.designation || "—"} · {form.department || "—"}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
              <Button size="sm" variant="outline" className="mt-2" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Change photo
              </Button>
              <p className="mt-1 text-[10px] text-muted-foreground">JPEG, PNG, or WebP · max 3MB</p>
            </div>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg font-bold">Employment details</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Your record was generated automatically from the official import. Only your <strong>Department</strong> and <strong>Work station</strong> can be updated here — the rest is permanent and managed by HR.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <F label="Full name"><Input value={form.full_name} readOnly disabled /></F>
            <F label="National ID"><Input value={form.national_id} readOnly disabled /></F>
            <F label="Personal / Employee number"><Input value={form.employee_no} readOnly disabled /></F>
            <F label="Phone (used for OTP)"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07XX XXX XXX" /></F>
            <F label="Designation"><Input value={form.designation} readOnly disabled /></F>
            <F label="Job group"><Input value={form.job_group} readOnly disabled placeholder="e.g. K" /></F>
            <F label="Department (editable)"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></F>
            <F label="Directorate"><Input value={form.directorate} readOnly disabled /></F>
            <F label="Work station (editable)"><Input value={form.work_station} onChange={(e) => setForm({ ...form, work_station: e.target.value })} /></F>
            <F label="Date of employment"><Input type="date" value={form.employment_date} readOnly disabled /></F>
            <F label="Gender"><Input value={form.gender} readOnly disabled /></F>
            <F label="Disability status"><Input value={form.disability_status} readOnly disabled /></F>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={save} disabled={saving}><Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving…" : "Save department & work station"}</Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
