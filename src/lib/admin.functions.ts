import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["employee","supervisor","hr","system_admin","super_admin","appeals_committee"] as const;

export const createUserWithRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8).max(128),
      full_name: z.string().min(1).max(120),
      designation: z.string().max(120).optional(),
      department: z.string().max(120).optional(),
      employee_no: z.string().max(40).optional(),
      role: z.enum(ROLES),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Only system_admin or super_admin
    const [{ data: isSys }, { data: isSuper }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "system_admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
    ]);
    if (!isSys && !isSuper) throw new Error("Only System Admins can create accounts");

    // Only super_admin may mint another super_admin
    if (data.role === "super_admin" && !isSuper) {
      throw new Error("Only Super Admins can create Super Admin accounts");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        designation: data.designation,
        department: data.department,
        employee_no: data.employee_no,
      },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("User creation returned no id");

    // handle_new_user trigger seeds profile + 'employee' role.
    // If a different role is requested, add it (keeping employee for fallback).
    if (data.role !== "employee") {
      await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: data.role });
    }

    return { id: newId, email: data.email };
  });
