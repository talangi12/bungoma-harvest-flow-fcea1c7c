import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import emblem from "@/assets/bungoma-emblem.png";
import { LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@/components/NotificationBell";
import { useRoles, hasAnyRole, ROLE_LABELS } from "@/hooks/useRoles";

export function AppHeader({ authenticated = false, userId }: { authenticated?: boolean; userId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: roles } = useRoles(userId);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const primaryRole = roles?.[0];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={emblem} alt="County Government of Bungoma emblem" className="h-10 w-10 object-contain" width={40} height={40} />
          <div className="leading-tight">
            <div className="font-display text-base font-bold text-primary">Bungoma EPMS</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">County Government of Bungoma</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5">
          {authenticated ? (
            <>
              <Link to="/dashboard" className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted sm:inline-block" activeProps={{ className: "bg-muted" }}>
                Dashboard
              </Link>
              <Link to="/appraisal" className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted sm:inline-block" activeProps={{ className: "bg-muted" }}>
                My Appraisal
              </Link>
              {hasAnyRole(roles, ["supervisor"]) && (
                <Link to="/supervisor/inbox" className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted sm:inline-block" activeProps={{ className: "bg-muted" }}>
                  Review Inbox
                </Link>
              )}
              {hasAnyRole(roles, ["system_admin", "super_admin"]) && (
                <Link to="/admin/roles" className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted sm:inline-block" activeProps={{ className: "bg-muted" }}>
                  Admin
                </Link>
              )}
              {primaryRole && (
                <span className="ml-1 hidden rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary md:inline-block">
                  {ROLE_LABELS[primaryRole]}
                </span>
              )}
              {userId && <NotificationBell userId={userId} />}
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="mr-1.5 h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth" className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted">Sign in</Link>
              <Link to="/auth" className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-card hover:opacity-90">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
