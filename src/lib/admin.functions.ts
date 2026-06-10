import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["employee","supervisor","hr","system_admin","super_admin","appeals_committee","governor","chief_officer","director"] as const;

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
      role_department: z.string().max(120).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: isSys }, { data: isSuper }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "system_admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
    ]);
    if (!isSys && !isSuper) throw new Error("Only System Admins can create accounts");
    if (data.role === "super_admin" && !isSuper) throw new Error("Only Super Admins can create Super Admin accounts");

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

    if (data.role !== "employee") {
      await supabaseAdmin.from("user_roles").insert({
        user_id: newId,
        role: data.role,
        department: data.role_department ?? data.department ?? null,
      });
    }
    return { id: newId, email: data.email };
  });

// One-shot bootstrap for the super26 admin account. Idempotent.
export const bootstrapSuperAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = "super26@bungoma.go.ke";
    const password = "Da2th26!";
    // Check existence
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw new Error(listErr.message);
    const existing = list.users.find((u) => u.email?.toLowerCase() === email);
    if (existing) {
      // Ensure roles in case profile/roles seeding missed it
      await supabaseAdmin.from("user_roles").upsert([
        { user_id: existing.id, role: "super_admin" },
        { user_id: existing.id, role: "system_admin" },
      ], { onConflict: "user_id,role,department", ignoreDuplicates: true } as never);
      return { created: false, id: existing.id, email };
    }
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: "System Super Admin", designation: "System Administrator", department: "Administration" },
    });
    if (error) throw new Error(error.message);
    return { created: true, id: created.user?.id, email };
  });
