export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appeals: {
        Row: {
          appellant_id: string
          appraisal_id: string
          committee_comments: string | null
          created_at: string
          desired_outcome: string | null
          evidence_paths: string[]
          grounds: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          ruling: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appellant_id: string
          appraisal_id: string
          committee_comments?: string | null
          created_at?: string
          desired_outcome?: string | null
          evidence_paths?: string[]
          grounds: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          ruling?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appellant_id?: string
          appraisal_id?: string
          committee_comments?: string | null
          created_at?: string
          desired_outcome?: string | null
          evidence_paths?: string[]
          grounds?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          ruling?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      appraisal_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          fy_end: string
          fy_label: string
          fy_start: string
          governor_signed_at: string | null
          governor_signed_by: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fy_end: string
          fy_label: string
          fy_start: string
          governor_signed_at?: string | null
          governor_signed_by?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fy_end?: string
          fy_label?: string
          fy_start?: string
          governor_signed_at?: string | null
          governor_signed_by?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      appraisals: {
        Row: {
          chosen_supervisor_id: string | null
          created_at: string
          cycle_signoffs: Json
          employee_comments: string | null
          employee_id: string
          employee_signed_at: string | null
          endyear_completed_at: string | null
          endyear_unlocked_at: string | null
          fy_start: string | null
          id: string
          midyear_completed_at: string | null
          midyear_unlocked_at: string | null
          pdf_generated_at: string | null
          pdf_path: string | null
          period: string
          rating: string | null
          recommendation: string | null
          rejection_reason: string | null
          self_commitments: string | null
          self_overall_comment: string | null
          status: string
          supervisor_comments: string | null
          supervisor_reviewed_at: string | null
          supervisor_signed_at: string | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          chosen_supervisor_id?: string | null
          created_at?: string
          cycle_signoffs?: Json
          employee_comments?: string | null
          employee_id: string
          employee_signed_at?: string | null
          endyear_completed_at?: string | null
          endyear_unlocked_at?: string | null
          fy_start?: string | null
          id?: string
          midyear_completed_at?: string | null
          midyear_unlocked_at?: string | null
          pdf_generated_at?: string | null
          pdf_path?: string | null
          period: string
          rating?: string | null
          recommendation?: string | null
          rejection_reason?: string | null
          self_commitments?: string | null
          self_overall_comment?: string | null
          status?: string
          supervisor_comments?: string | null
          supervisor_reviewed_at?: string | null
          supervisor_signed_at?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          chosen_supervisor_id?: string | null
          created_at?: string
          cycle_signoffs?: Json
          employee_comments?: string | null
          employee_id?: string
          employee_signed_at?: string | null
          endyear_completed_at?: string | null
          endyear_unlocked_at?: string | null
          fy_start?: string | null
          id?: string
          midyear_completed_at?: string | null
          midyear_unlocked_at?: string | null
          pdf_generated_at?: string | null
          pdf_path?: string | null
          period?: string
          rating?: string | null
          recommendation?: string | null
          rejection_reason?: string | null
          self_commitments?: string | null
          self_overall_comment?: string | null
          status?: string
          supervisor_comments?: string | null
          supervisor_reviewed_at?: string | null
          supervisor_signed_at?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appraisals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      cycle_department_activations: {
        Row: {
          chief_officer_id: string | null
          chief_officer_signed_at: string | null
          cycle_id: string
          department: string
          director_id: string | null
          director_signed_at: string | null
          id: string
          supervisor_id: string | null
          supervisor_signed_at: string | null
          updated_at: string
        }
        Insert: {
          chief_officer_id?: string | null
          chief_officer_signed_at?: string | null
          cycle_id: string
          department: string
          director_id?: string | null
          director_signed_at?: string | null
          id?: string
          supervisor_id?: string | null
          supervisor_signed_at?: string | null
          updated_at?: string
        }
        Update: {
          chief_officer_id?: string | null
          chief_officer_signed_at?: string | null
          cycle_id?: string
          department?: string
          director_id?: string | null
          director_signed_at?: string | null
          id?: string
          supervisor_id?: string | null
          supervisor_signed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_department_activations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "appraisal_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          related_appraisal_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          related_appraisal_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          related_appraisal_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          chief_officer_id: string | null
          created_at: string
          department: string | null
          designation: string | null
          director_id: string | null
          directorate: string | null
          division: string | null
          email: string | null
          employee_no: string | null
          employment_date: string | null
          employment_status: string | null
          full_name: string
          id: string
          job_group: string | null
          national_id: string | null
          phone: string | null
          photo_url: string | null
          supervisor_id: string | null
          updated_at: string
          work_station: string | null
        }
        Insert: {
          chief_officer_id?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          director_id?: string | null
          directorate?: string | null
          division?: string | null
          email?: string | null
          employee_no?: string | null
          employment_date?: string | null
          employment_status?: string | null
          full_name: string
          id: string
          job_group?: string | null
          national_id?: string | null
          phone?: string | null
          photo_url?: string | null
          supervisor_id?: string | null
          updated_at?: string
          work_station?: string | null
        }
        Update: {
          chief_officer_id?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          director_id?: string | null
          directorate?: string | null
          division?: string | null
          email?: string | null
          employee_no?: string | null
          employment_date?: string | null
          employment_status?: string | null
          full_name?: string
          id?: string
          job_group?: string | null
          national_id?: string | null
          phone?: string | null
          photo_url?: string | null
          supervisor_id?: string | null
          updated_at?: string
          work_station?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_chief_officer_id_fkey"
            columns: ["chief_officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      targets: {
        Row: {
          achieved_result: string | null
          appraisal_id: string
          created_at: string
          endyear_actual: string | null
          endyear_self_comment: string | null
          endyear_self_score: number | null
          endyear_supervisor_comment: string | null
          endyear_supervisor_score: number | null
          evidence_url: string | null
          expected_outcome: string | null
          id: string
          indicator: string | null
          midyear_progress: string | null
          midyear_score: number | null
          midyear_supervisor_comment: string | null
          score: number | null
          sort_order: number
          supervisor_review: string | null
          target: string
          weight: number
        }
        Insert: {
          achieved_result?: string | null
          appraisal_id: string
          created_at?: string
          endyear_actual?: string | null
          endyear_self_comment?: string | null
          endyear_self_score?: number | null
          endyear_supervisor_comment?: string | null
          endyear_supervisor_score?: number | null
          evidence_url?: string | null
          expected_outcome?: string | null
          id?: string
          indicator?: string | null
          midyear_progress?: string | null
          midyear_score?: number | null
          midyear_supervisor_comment?: string | null
          score?: number | null
          sort_order?: number
          supervisor_review?: string | null
          target: string
          weight?: number
        }
        Update: {
          achieved_result?: string | null
          appraisal_id?: string
          created_at?: string
          endyear_actual?: string | null
          endyear_self_comment?: string | null
          endyear_self_score?: number | null
          endyear_supervisor_comment?: string | null
          endyear_supervisor_score?: number | null
          evidence_url?: string | null
          expected_outcome?: string | null
          id?: string
          indicator?: string | null
          midyear_progress?: string | null
          midyear_score?: number | null
          midyear_supervisor_comment?: string | null
          score?: number | null
          sort_order?: number
          supervisor_review?: string | null
          target?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "targets_appraisal_id_fkey"
            columns: ["appraisal_id"]
            isOneToOne: false
            referencedRelation: "appraisals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          department: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      classify_rating: { Args: { pct: number }; Returns: string }
      cycle_active_for_dept: { Args: { _dept: string }; Returns: boolean }
      endyear_unlocked: { Args: { _appraisal_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_dept: {
        Args: {
          _dept: string
          _role: Database["public"]["Enums"]["app_role"]
          _uid: string
        }
        Returns: boolean
      }
      is_admin_viewer: { Args: { _uid: string }; Returns: boolean }
      list_supervisors: {
        Args: never
        Returns: {
          department: string
          designation: string
          full_name: string
          id: string
        }[]
      }
      log_audit: {
        Args: {
          _action: string
          _entity_id?: string
          _entity_type?: string
          _new?: Json
          _old?: Json
        }
        Returns: undefined
      }
      midyear_unlocked: { Args: { _appraisal_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "employee"
        | "supervisor"
        | "department_head"
        | "hr_officer"
        | "cpmc"
        | "board"
        | "chief_officer"
        | "county_administrator"
        | "admin"
        | "super_admin"
        | "hr"
        | "system_admin"
        | "appeals_committee"
        | "governor"
        | "director"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "employee",
        "supervisor",
        "department_head",
        "hr_officer",
        "cpmc",
        "board",
        "chief_officer",
        "county_administrator",
        "admin",
        "super_admin",
        "hr",
        "system_admin",
        "appeals_committee",
        "governor",
        "director",
      ],
    },
  },
} as const
