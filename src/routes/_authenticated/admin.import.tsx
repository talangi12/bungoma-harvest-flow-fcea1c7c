import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRoles, hasAnyRole } from "@/hooks/useRoles";
import { UploadCloud, ShieldCheck, FileSpreadsheet } from "lucide-react";
import { bulkImportEmployees, type ImportRow } from "@/lib/import.functions";

export const Route = createFileRoute("/_authenticated/admin/import")({
  head: () => ({ meta: [{ title: "Hierarchical Import — Bungoma EPMS" }] }),
  component: ImportPage,
});

const TEMPLATE = "id_number,full_name,personal_number,department,directorate,workstation,job_group,gender,disability_status,designation\n12345678,John Wafula Wanyonyi,1234567,Agriculture,Crops,Kanduyi,K,Male,None,Officer";

const TARGET_ROLES = [
  { value: "cec", label: "CEC (created by Governor)" },
  { value: "chief_officer", label: "Chief Officer (created by CEC)" },
  { value: "director", label: "Director (created by Chief Officer)" },
  { value: "supervisor", label: "Supervisor (created by Director)" },
  { value: "employee", label: "Employee / Appraisee (created by Director)" },
] as const;

function parseCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const obj: Record<string, string> = {};
    header.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
    return {
      id_number: obj.id_number ?? "",
      full_name: obj.full_name ?? "",
      personal_number: obj.personal_number ?? "",
      department: obj.department ?? "",
      directorate: obj.directorate ?? "",
      workstation: obj.workstation ?? "",
      job_group: obj.job_group ?? "",
      gender: obj.gender ?? "",
      disability_status: obj.disability_status ?? "",
      designation: obj.designation ?? "",
    };
  });
}

function ImportPage() {
  const { user } = Route.useRouteContext();
  const { data: roles, isLoading } = useRoles(user.id);
  const allowed = hasAnyRole(roles, ["governor", "cec", "chief_officer", "director", "system_admin", "super_admin"]);
  const importFn = useServerFn(bulkImportEmployees);

  const [csv, setCsv] = useState("");
  const [targetRole, setTargetRole] = useState<typeof TARGET_ROLES[number]["value"]>("employee");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof bulkImportEmployees>> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => parseCSV(csv), [csv]);

  function onFile(file: File) {
    if (!/\.csv$/i.test(file.name)) return toast.error("Please choose a .csv file");
    if (file.size > 5 * 1024 * 1024) return toast.error("CSV must be 5MB or smaller");
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsv(text);
      const parsed = parseCSV(text);
      toast.success(`Loaded ${parsed.length} row${parsed.length === 1 ? "" : "s"} from ${file.name}`);
    };
    reader.onerror = () => toast.error("Could not read file");
    reader.readAsText(file);
  }

  async function submit() {
    if (rows.length === 0) return toast.error("No rows parsed. Use the CSV template.");
    setBusy(true);
    try {
      const res = await importFn({ data: { target_role: targetRole, rows } });
      setResult(res);
      toast.success(`Created ${res.created}, skipped ${res.skipped}, errors ${res.errors}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isLoading && !allowed) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader authenticated userId={user.id} />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Card className="p-10 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-3 font-display text-2xl font-bold">Importers only</h1>
            <p className="mt-2 text-sm text-muted-foreground">Only Governor, CECs, Chief Officers, Directors, and System Admins may import records.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader authenticated userId={user.id} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Administration</div>
          <h1 className="mt-2 font-display text-3xl font-bold flex items-center gap-2"><UploadCloud className="h-7 w-7 text-primary" /> Hierarchical bulk import</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each tier imports the tier directly below it. The system enforces departmental and directorate boundaries on every row.
          </p>
        </div>

        <Card className="mt-6 p-5">
          <h2 className="font-display text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" /> CSV template</h2>
          <p className="mt-1 text-xs text-muted-foreground">First row must be the header. Download / copy the template, fill in the rows in Excel, save as CSV, then upload below.</p>
          <pre className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-[10px] overflow-x-auto">{TEMPLATE}</pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(TEMPLATE)}>Copy template</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const blob = new Blob([TEMPLATE], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "epms-import-template.csv"; a.click();
              URL.revokeObjectURL(url);
            }}>Download template</Button>
          </div>
        </Card>

        <Card className="mt-6 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Target role to create</Label>
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={targetRole} onChange={(e) => setTargetRole(e.target.value as typeof targetRole)}>
                {TARGET_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex items-end justify-end">
              <Badge variant="secondary">Parsed rows: {rows.length}</Badge>
            </div>
          </div>

          <div className="mt-4">
            <Label>Upload CSV file</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <UploadCloud className="mr-1.5 h-4 w-4" /> Choose CSV file
              </Button>
              {csv && <Button variant="ghost" size="sm" onClick={() => { setCsv(""); if (fileRef.current) fileRef.current.value = ""; }}>Clear</Button>}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">.csv only · max 5MB · imported records are inserted into the database immediately and become available to the appraisee.</p>
          </div>

          <div className="mt-4">
            <Label htmlFor="csv">Or paste CSV rows</Label>
            <Textarea id="csv" rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={TEMPLATE} className="font-mono text-xs" />
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={busy || rows.length === 0} onClick={submit}>{busy ? "Importing…" : `Import ${rows.length} record${rows.length === 1 ? "" : "s"}`}</Button>
          </div>
        </Card>


        {result && (
          <Card className="mt-6 p-5">
            <h2 className="font-display text-sm font-bold">Result</h2>
            <div className="mt-2 flex gap-2 text-xs">
              <Badge variant="default">Created {result.created}</Badge>
              <Badge variant="secondary">Skipped {result.skipped}</Badge>
              <Badge variant="destructive">Errors {result.errors}</Badge>
            </div>
            <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left uppercase tracking-wider"><tr><th className="px-2 py-1">ID</th><th>Status</th><th>Message</th></tr></thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1 font-mono">{r.id_number}</td>
                      <td className={r.status === "created" ? "text-primary" : r.status === "error" ? "text-destructive" : "text-muted-foreground"}>{r.status}</td>
                      <td className="px-2 py-1 text-muted-foreground">{r.message ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
