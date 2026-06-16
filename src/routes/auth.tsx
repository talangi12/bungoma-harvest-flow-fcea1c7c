import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import emblem from "@/assets/bungoma-emblem.png";
import landscape from "@/assets/bungoma-landscape.jpg";
import { resolveLoginEmail, bootstrapDefaultSuperAdmin } from "@/lib/auth-helpers.functions";
import { requestOtp, verifyOtp } from "@/lib/otp.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Bungoma EPMS" }, { name: "description", content: "Sign in to the County Government of Bungoma Performance Management System." }] }),
  component: AuthPage,
});

function AuthPage() {
  const resolveFn = useServerFn(resolveLoginEmail);
  const bootstrapFn = useServerFn(bootstrapDefaultSuperAdmin);
  const requestOtpFn = useServerFn(requestOtp);
  const verifyOtpFn = useServerFn(verifyOtp);

  // OTP state
  const [otpStep, setOtpStep] = useState<"start" | "code">("start");
  const [otpId, setOtpId] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpExpires, setOtpExpires] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);

  // Password (admin) state
  const [idNumber, setIdNumber] = useState("");
  const [personalNumber, setPersonalNumber] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

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
        user_id: userId, id_number: (idNumber || otpId).trim() || null, email,
        success, failure_reason: reason ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      });
    } catch { /* non-blocking */ }
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    try {
      const res = await requestOtpFn({ data: { id_number: otpId.trim(), phone: otpPhone.trim() } });
      setOtpStep("code");
      setOtpExpires(res.expires_at);
      toast.success(`OTP sent. Demo code: ${res.mock_code}`, { duration: 12000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send OTP");
    } finally { setOtpLoading(false); }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    try {
      const { token_hash, email } = await verifyOtpFn({ data: { id_number: otpId.trim(), code: otpCode.trim() } });
      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: "email" });
      if (error) throw error;
      await recordEvent(true, data.user?.id ?? null, email);
      const dest = data.user ? await resolveDest(data.user.id) : "/dashboard";
      window.location.href = dest;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally { setOtpLoading(false); }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    try {
      const { email } = await resolveFn({ data: { id_number: idNumber.trim() } });
      const { data: signed, error } = await supabase.auth.signInWithPassword({ email, password: personalNumber });
      if (error) { await recordEvent(false, null, email, error.message); throw error; }
      await recordEvent(true, signed.user?.id ?? null, email);
      const dest = signed.user ? await resolveDest(signed.user.id) : "/admin";
      window.location.href = dest;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally { setPwLoading(false); }
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
            <p className="mt-4 max-w-md text-primary-foreground/85">Secure OTP sign-in for over 7,000 public servants.</p>
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
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your National ID & phone OTP.</p>

          <Tabs defaultValue="otp" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="otp">Employee OTP</TabsTrigger>
              <TabsTrigger value="admin">Administrator</TabsTrigger>
            </TabsList>

            <TabsContent value="otp">
              <Card className="p-6 shadow-card">
                {otpStep === "start" ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <Label htmlFor="oid">National ID Number</Label>
                      <Input id="oid" required value={otpId} onChange={(e) => setOtpId(e.target.value)} placeholder="e.g. 12345678" autoComplete="username" />
                    </div>
                    <div>
                      <Label htmlFor="ophone">Registered Phone Number</Label>
                      <Input id="ophone" required value={otpPhone} onChange={(e) => setOtpPhone(e.target.value)} placeholder="0712 345 678" inputMode="tel" />
                    </div>
                    <Button type="submit" disabled={otpLoading} className="w-full">
                      {otpLoading ? "Sending…" : "Send OTP"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                      Enter the 6-digit code sent to your phone. Expires {otpExpires ? new Date(otpExpires).toLocaleTimeString() : "in 5 min"}. Max 3 attempts.
                    </div>
                    <div>
                      <Label htmlFor="ocode">OTP Code</Label>
                      <Input id="ocode" required value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="••••••" inputMode="numeric" maxLength={6} autoFocus />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="w-full" onClick={() => { setOtpStep("start"); setOtpCode(""); }}>Back</Button>
                      <Button type="submit" disabled={otpLoading} className="w-full">
                        {otpLoading ? "Verifying…" : "Verify & Sign in"}
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="admin">
              <Card className="p-6 shadow-card">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="idn">ID Number</Label>
                    <Input id="idn" required value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. 010203045" autoComplete="username" />
                  </div>
                  <div>
                    <Label htmlFor="pnum">Personal Number / Password</Label>
                    <Input id="pnum" type="password" required value={personalNumber} onChange={(e) => setPersonalNumber(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                  </div>
                  <Button type="submit" disabled={pwLoading} className="w-full">
                    {pwLoading ? "Please wait…" : "Sign in"}
                  </Button>
                </form>
              </Card>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">Admin fallback. Employees must use OTP.</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
