import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TARGET_ROLES = ["cec", "chief_officer", "director", "supervisor", "employee"] as const;

const RowSchema = z.object({
  id_number: z.string().trim().min(4).max(20),
  full_name: z.string().trim().min(3).max(150),
  personal_number: z.string().trim().regex(/^\d{1,11}$/, "Personal Number must be up to 11 digits"),
  department: z.string().trim().min(1).max(120),
  directorate: z.string().trim().max(120).optional().default(""),
  workstation: z.string().trim().max(120).optional().default(""),
  job_group: z.string().trim().max(20).optional().default(""),
  gender: z.string().trim().max(20).optional().default(""),
  disability_status: z.string().trim().max(40).optional().default(""),
  designation: z.string().trim().max(120).optional().default(""),
});

export type ImportRow = z.infer<typeof RowSchema>;

export const bulkImportEmployees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      target_role: z.enum(TARGET_ROLES),
      rows: z.array(RowSchema).min(1).max(2000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const results: Array<{ id_number: string; status: "created" | "skipped" | "error"; message?: string }> = [];

    for (const row of data.rows) {
      // 1) Authorization check — per row dept/directorate
      const { data: allowed, error: authErr } = await supabase.rpc("can_import", {
        _actor: userId,
        _target_role: data.target_role,
        _dept: row.department,
        _directorate: row.directorate || null,
      });
      if (authErr || !allowed) {
        results.push({ id_number: row.id_number, status: "error", message: "Not authorised to import this record" });
        continue;
      }

      // 2) Skip if ID exists
      const { data: existing } = await supabaseAdmin
        .from("profiles").select("id").eq("id_number", row.id_number).maybeSingle();
      if (existing) {
        results.push({ id_number: row.id_number, status: "skipped", message: "Already exists" });
        continue;
      }

      // 3) Create auth user — synthetic email
      const synthetic = `id_${row.id_number.toLowerCase()}@epms.bungoma.local`;
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: synthetic,
        password: row.personal_number,
        email_confirm: true,
        user_metadata: {
          full_name: row.full_name,
          id_number: row.id_number,
          personal_number: row.personal_number,
          department: row.department,
          directorate: row.directorate,
          workstation: row.workstation,
          job_group: row.job_group,
          gender: row.gender,
          disability_status: row.disability_status,
          designation: row.designation,
          employee_no: row.id_number,
          must_change_password: true,
          imported_by: userId,
        },
      });
      if (createErr || !created.user) {
        results.push({ id_number: row.id_number, status: "error", message: createErr?.message ?? "Create failed" });
        continue;
      }

      // 4) Assign role (employee default already from trigger; add target role if non-employee)
      if (data.target_role !== "employee") {
        await supabaseAdmin.from("user_roles").insert({
          user_id: created.user.id,
          role: data.target_role,
          department: row.department,
        });
      }

      // 5) Audit
      await supabaseAdmin.rpc("log_audit", {
        _action: "employee_imported",
        _entity_type: "profiles",
        _entity_id: created.user.id,
        _old: null,
        _new: { id_number: row.id_number, role: data.target_role, dept: row.department, directorate: row.directorate },
      });

      results.push({ id_number: row.id_number, status: "created" });
    }

    return {
      created: results.filter((r) => r.status === "created").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    };
  });
