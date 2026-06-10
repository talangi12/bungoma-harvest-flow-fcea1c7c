import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import emblem from "@/assets/bungoma-emblem.png";
import landscape from "@/assets/bungoma-landscape.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Bungoma EPMS" }, { name: "description", content: "Sign in to the County Government of Bungoma Performance Management System." }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeNo, setEmployeeNo] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, employee_no: employeeNo, department },
          },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "Authentication failed";
      toast.error(m);
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";
  const subtitle = mode === "signin"
    ? "Sign in to manage your performance appraisal."
    : mode === "signup"
      ? "Register as a county employee to begin your appraisal."
      : "Enter your email and we'll send a secure reset link.";

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

          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <Card className="mt-6 p-6 shadow-card">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Wanjala Nafula" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="empno">Employee No.</Label>
                      <Input id="empno" value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} placeholder="BGM-00123" />
                    </div>
                    <div>
                      <Label htmlFor="dept">Department</Label>
                      <Input id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Agriculture" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@bungoma.go.ke" />
              </div>
              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button type="button" onClick={() => setMode("forgot")} className="text-xs font-medium text-primary hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
              </Button>
            </form>
          </Card>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "forgot" ? (
              <button onClick={() => setMode("signin")} className="font-medium text-primary hover:underline">← Back to sign in</button>
            ) : mode === "signin" ? (
              <>New to EPMS?{" "}
                <button onClick={() => setMode("signup")} className="font-medium text-primary hover:underline">Create account</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="font-medium text-primary hover:underline">Sign in</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
