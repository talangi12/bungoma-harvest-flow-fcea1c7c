import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Resolve an ID Number to the synthetic login email (no auth required - login lookup).
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id_number: z.string().trim().min(3).max(20) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("email, id_number, must_change_password")
      .eq("id_number", data.id_number)
      .maybeSingle();
    if (prof?.email) return { email: prof.email, must_change_password: prof.must_change_password };
    // Fallback to synthetic format
    return { email: `id_${data.id_number.toLowerCase()}@epms.bungoma.local`, must_change_password: false };
  });

// Update current user's password and clear the must_change_password flag.
export const changeOwnPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ new_password: z.string().min(8).max(128) }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.new_password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ must_change_password: false }).eq("id", userId);
    await supabaseAdmin.rpc("log_audit", {
      _action: "password_changed",
      _entity_type: "auth.users",
      _entity_id: userId,
      _old: null, _new: null,
    });
    return { ok: true };
  });

// Bootstrap the default super admin (010203045). Idempotent. Public endpoint hit once.
export const bootstrapDefaultSuperAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = "010203045";
    const password = "0725393939";
    const email = `id_${id}@epms.bungoma.local`;

    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw new Error(listErr.message);
    const existing = list.users.find((u) => u.email?.toLowerCase() === email);
    if (existing) {
      await supabaseAdmin.from("user_roles").upsert([
        { user_id: existing.id, role: "super_admin" },
        { user_id: existing.id, role: "system_admin" },
      ], { onConflict: "user_id,role,department", ignoreDuplicates: true } as never);
      return { created: false, id: existing.id };
    }
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: {
        full_name: "System Super Administrator",
        id_number: id,
        personal_number: password,
        designation: "System Administrator",
        department: "Administration",
        must_change_password: false,
      },
    });
    if (error) throw new Error(error.message);
    return { created: true, id: created.user?.id };
  });
