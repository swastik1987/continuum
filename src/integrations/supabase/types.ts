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
      care_plan_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["action_type"]
          care_plan_id: string | null
          clinical_priority:
            | Database["public"]["Enums"]["clinical_priority"]
            | null
          completed_via_event_id: string | null
          created_at: string | null
          decline_reason: string | null
          due_date: string | null
          id: string
          member_id: string | null
          provenance: Database["public"]["Enums"]["action_provenance"] | null
          status: Database["public"]["Enums"]["action_status"] | null
          title: string
          why_plain: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["action_type"]
          care_plan_id?: string | null
          clinical_priority?:
            | Database["public"]["Enums"]["clinical_priority"]
            | null
          completed_via_event_id?: string | null
          created_at?: string | null
          decline_reason?: string | null
          due_date?: string | null
          id?: string
          member_id?: string | null
          provenance?: Database["public"]["Enums"]["action_provenance"] | null
          status?: Database["public"]["Enums"]["action_status"] | null
          title: string
          why_plain?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["action_type"]
          care_plan_id?: string | null
          clinical_priority?:
            | Database["public"]["Enums"]["clinical_priority"]
            | null
          completed_via_event_id?: string | null
          created_at?: string | null
          decline_reason?: string | null
          due_date?: string | null
          id?: string
          member_id?: string | null
          provenance?: Database["public"]["Enums"]["action_provenance"] | null
          status?: Database["public"]["Enums"]["action_status"] | null
          title?: string
          why_plain?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_plan_actions_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "care_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plan_actions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plans: {
        Row: {
          consultation_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          member_id: string | null
          status: Database["public"]["Enums"]["plan_status"] | null
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          member_id?: string | null
          status?: Database["public"]["Enums"]["plan_status"] | null
        }
        Update: {
          consultation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          member_id?: string | null
          status?: Database["public"]["Enums"]["plan_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "care_plans_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_events: {
        Row: {
          event_type: Database["public"]["Enums"]["clinical_event_type"]
          id: string
          linked_action_id: string | null
          member_id: string | null
          occurred_at: string | null
          payload: Json | null
          source: Database["public"]["Enums"]["event_source"]
        }
        Insert: {
          event_type: Database["public"]["Enums"]["clinical_event_type"]
          id?: string
          linked_action_id?: string | null
          member_id?: string | null
          occurred_at?: string | null
          payload?: Json | null
          source: Database["public"]["Enums"]["event_source"]
        }
        Update: {
          event_type?: Database["public"]["Enums"]["clinical_event_type"]
          id?: string
          linked_action_id?: string | null
          member_id?: string | null
          occurred_at?: string | null
          payload?: Json | null
          source?: Database["public"]["Enums"]["event_source"]
        }
        Relationships: [
          {
            foreignKeyName: "clinical_events_linked_action_id_fkey"
            columns: ["linked_action_id"]
            isOneToOne: false
            referencedRelation: "care_plan_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          chief_complaint: string | null
          consulted_at: string | null
          id: string
          member_id: string | null
          mode: Database["public"]["Enums"]["consult_mode"] | null
          provider_id: string | null
          summary: string | null
        }
        Insert: {
          chief_complaint?: string | null
          consulted_at?: string | null
          id?: string
          member_id?: string | null
          mode?: Database["public"]["Enums"]["consult_mode"] | null
          provider_id?: string | null
          summary?: string | null
        }
        Update: {
          chief_complaint?: string | null
          consulted_at?: string | null
          id?: string
          member_id?: string | null
          mode?: Database["public"]["Enums"]["consult_mode"] | null
          provider_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string | null
          dob: string | null
          drop_segment: Database["public"]["Enums"]["drop_segment"] | null
          full_name: string
          gender: string | null
          id: string
          is_chronic: boolean | null
          org_id: string | null
          phone: string | null
          preferred_language: string | null
          risk_drivers: Json | null
          risk_score: number | null
          risk_tier: Database["public"]["Enums"]["risk_tier"] | null
          wallet_balance: number | null
        }
        Insert: {
          created_at?: string | null
          dob?: string | null
          drop_segment?: Database["public"]["Enums"]["drop_segment"] | null
          full_name: string
          gender?: string | null
          id?: string
          is_chronic?: boolean | null
          org_id?: string | null
          phone?: string | null
          preferred_language?: string | null
          risk_drivers?: Json | null
          risk_score?: number | null
          risk_tier?: Database["public"]["Enums"]["risk_tier"] | null
          wallet_balance?: number | null
        }
        Update: {
          created_at?: string | null
          dob?: string | null
          drop_segment?: Database["public"]["Enums"]["drop_segment"] | null
          full_name?: string
          gender?: string | null
          id?: string
          is_chronic?: boolean | null
          org_id?: string | null
          phone?: string | null
          preferred_language?: string | null
          risk_drivers?: Json | null
          risk_score?: number | null
          risk_tier?: Database["public"]["Enums"]["risk_tier"] | null
          wallet_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["msg_channel"] | null
          created_at: string | null
          id: string
          member_id: string | null
          sender: Database["public"]["Enums"]["msg_sender"]
        }
        Insert: {
          body: string
          channel?: Database["public"]["Enums"]["msg_channel"] | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          sender: Database["public"]["Enums"]["msg_sender"]
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["msg_channel"] | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          sender?: Database["public"]["Enums"]["msg_sender"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      navigator_tasks: {
        Row: {
          created_at: string | null
          id: string
          member_id: string | null
          navigator_id: string | null
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          trigger_reason: Database["public"]["Enums"]["task_reason"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id?: string | null
          navigator_id?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          trigger_reason: Database["public"]["Enums"]["task_reason"]
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string | null
          navigator_id?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          trigger_reason?: Database["public"]["Enums"]["task_reason"]
        }
        Relationships: [
          {
            foreignKeyName: "navigator_tasks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigator_tasks_navigator_id_fkey"
            columns: ["navigator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nudges: {
        Row: {
          action_id: string | null
          channel: Database["public"]["Enums"]["nudge_channel"] | null
          id: string
          member_id: string | null
          response_text: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["nudge_status"] | null
          suppression_reason: string | null
          template_key: string | null
        }
        Insert: {
          action_id?: string | null
          channel?: Database["public"]["Enums"]["nudge_channel"] | null
          id?: string
          member_id?: string | null
          response_text?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["nudge_status"] | null
          suppression_reason?: string | null
          template_key?: string | null
        }
        Update: {
          action_id?: string | null
          channel?: Database["public"]["Enums"]["nudge_channel"] | null
          id?: string
          member_id?: string | null
          response_text?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["nudge_status"] | null
          suppression_reason?: string | null
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nudges_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "care_plan_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          contract_lives: number | null
          created_at: string | null
          id: string
          name: string
          plan_type: string | null
        }
        Insert: {
          contract_lives?: number | null
          created_at?: string | null
          id?: string
          name: string
          plan_type?: string | null
        }
        Update: {
          contract_lives?: number | null
          created_at?: string | null
          id?: string
          name?: string
          plan_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          member_id: string | null
          org_id: string | null
          provider_id: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          member_id?: string | null
          org_id?: string | null
          provider_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          member_id?: string | null
          org_id?: string | null
          provider_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          specialty: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          specialty?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          specialty?: string | null
        }
        Relationships: []
      }
      sim_state: {
        Row: {
          current_day: string
          id: number
          updated_at: string | null
        }
        Insert: {
          current_day?: string
          id?: number
          updated_at?: string | null
        }
        Update: {
          current_day?: string
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      action_provenance:
        | "clinician_authored"
        | "clinician_confirmed"
        | "system_suggested"
      action_status:
        | "pending"
        | "scheduled"
        | "completed"
        | "snoozed"
        | "declined"
        | "overdue"
      action_type:
        | "lab_test"
        | "follow_up_consult"
        | "medication"
        | "vaccination"
        | "lifestyle"
        | "imaging"
      clinical_event_type:
        | "appointment_booked"
        | "appointment_attended"
        | "diagnostic_completed"
        | "pharmacy_fulfilled"
        | "er_visit"
        | "home_collection_scheduled"
      clinical_priority: "mandatory" | "recommended" | "optional"
      consult_mode: "tele" | "in_person"
      drop_segment:
        | "forgot"
        | "cost"
        | "feels_better"
        | "logistics"
        | "lost_thread"
        | "trust"
        | "avoidance"
        | "none"
      event_source: "diagnostics" | "pharmacy" | "clinic" | "ambulance" | "app"
      msg_channel: "whatsapp" | "app"
      msg_sender: "system" | "member" | "navigator" | "clinician"
      nudge_channel: "whatsapp" | "app" | "sms" | "call"
      nudge_status:
        | "queued"
        | "sent"
        | "delivered"
        | "read"
        | "responded"
        | "suppressed"
      plan_status: "active" | "completed" | "abandoned"
      risk_tier: "low" | "medium" | "high"
      task_priority: "p1" | "p2" | "p3"
      task_reason:
        | "post_er_72h"
        | "declined_mandatory"
        | "repeat_dropper"
        | "abnormal_result"
        | "high_risk_overdue"
        | "structural_barrier"
      task_status: "open" | "in_progress" | "resolved" | "snoozed"
      user_role:
        | "patient"
        | "navigator"
        | "clinician"
        | "employer_admin"
        | "admin"
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
      action_provenance: [
        "clinician_authored",
        "clinician_confirmed",
        "system_suggested",
      ],
      action_status: [
        "pending",
        "scheduled",
        "completed",
        "snoozed",
        "declined",
        "overdue",
      ],
      action_type: [
        "lab_test",
        "follow_up_consult",
        "medication",
        "vaccination",
        "lifestyle",
        "imaging",
      ],
      clinical_event_type: [
        "appointment_booked",
        "appointment_attended",
        "diagnostic_completed",
        "pharmacy_fulfilled",
        "er_visit",
        "home_collection_scheduled",
      ],
      clinical_priority: ["mandatory", "recommended", "optional"],
      consult_mode: ["tele", "in_person"],
      drop_segment: [
        "forgot",
        "cost",
        "feels_better",
        "logistics",
        "lost_thread",
        "trust",
        "avoidance",
        "none",
      ],
      event_source: ["diagnostics", "pharmacy", "clinic", "ambulance", "app"],
      msg_channel: ["whatsapp", "app"],
      msg_sender: ["system", "member", "navigator", "clinician"],
      nudge_channel: ["whatsapp", "app", "sms", "call"],
      nudge_status: [
        "queued",
        "sent",
        "delivered",
        "read",
        "responded",
        "suppressed",
      ],
      plan_status: ["active", "completed", "abandoned"],
      risk_tier: ["low", "medium", "high"],
      task_priority: ["p1", "p2", "p3"],
      task_reason: [
        "post_er_72h",
        "declined_mandatory",
        "repeat_dropper",
        "abnormal_result",
        "high_risk_overdue",
        "structural_barrier",
      ],
      task_status: ["open", "in_progress", "resolved", "snoozed"],
      user_role: [
        "patient",
        "navigator",
        "clinician",
        "employer_admin",
        "admin",
      ],
    },
  },
} as const
