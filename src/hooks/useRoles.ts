import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "employee"
  | "supervisor"
  | "hr"
  | "system_admin"
  | "super_admin"
  | "appeals_committee";

export const ROLE_LABELS: Record<AppRole, string> = {
  employee: "Appraisee",
  supervisor: "Supervisor",
  hr: "HR Officer",
  system_admin: "System Admin",
  super_admin: "Super Admin",
  appeals_committee: "Appeals Committee",
};

export const ROLE_RESPONSIBILITIES: Record<AppRole, string> = {
  employee: "Set targets, sign agreements, complete self-assessment and view your appraisals.",
  supervisor: "Review submitted targets and appraisals, approve or reject with comments, sign agreements and provide mid-year feedback.",
  hr: "Oversee appraisal cycles county-wide, monitor compliance and view all appraisals.",
  system_admin: "Manage users, assign roles and maintain system configuration.",
  super_admin: "Full administrative authority across the EPMS, including HR, system and audit operations.",
  appeals_committee: "Review and rule on appraisal appeals submitted by employees.",
};

export function useRoles(userId?: string) {
  return useQuery({
    queryKey: ["roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}

export function hasAnyRole(roles: AppRole[] | undefined, target: AppRole[]) {
  if (!roles) return false;
  return roles.some((r) => target.includes(r));
}
